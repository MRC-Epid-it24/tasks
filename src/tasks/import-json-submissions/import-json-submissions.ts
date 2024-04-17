/*
    Intake24 Tasks
    Copyright (C) 2021-2023 MRC Epidemiology Unit, University of Cambridge

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import type { PoolClient } from 'pg';
import { AsyncParser } from '@json2csv/node';
import fs from 'fs-extra';
import mssql from 'mssql';
import path from 'node:path';

import { db } from '@/services/db';
import logger from '@/services/logger';

import type { Task, TaskDefinition } from '..';
import type { SubmissionData } from './submission';
import HasMsSqlPool from '../has-mssql-pool';
import { fields, round } from './fields';
import { MISSING_FOOD_CODE, NA } from './submission';

export type ImportJsonSubmissionsData = {
  localeId: string;
  dir: string;
  output: 'csv' | 'database';
};

export type Nutrient = { id: number; name: string };
export type Nutrients = Record<string, Nutrient>;

export type FoodGroup = { id: number; englishName: string; localName: string };
export type FoodGroups = Record<string, FoodGroup>;

export type Row = Record<string, any>;

export default class ImportJsonSubmissions
  extends HasMsSqlPool
  implements Task<ImportJsonSubmissionsData> {
  readonly name: string;

  readonly params: ImportJsonSubmissionsData;

  protected pgClients!: Record<'foods' | 'system', PoolClient>;

  protected foodGroups: FoodGroups;

  protected nutrients: Nutrients;

  protected fields = fields;

  public message = '';

  constructor(taskDef: TaskDefinition<ImportJsonSubmissionsData>) {
    super(taskDef);

    const { name, params } = taskDef;
    this.name = name;
    this.params = params;

    this.foodGroups = {};
    this.nutrients = {};
  }

  async run() {
    const [foods, system] = await Promise.all([
      db.v3.foods.getPool().connect(),
      db.v3.system.getPool().connect(),
      this.initMSPool(),
    ]);
    this.pgClients = { foods, system };

    const { localeId } = this.params;

    try {
      await Promise.all([this.loadFoodGroups(localeId), this.loadNutrients(localeId)]);

      const dir = path.resolve(this.params.dir);
      if (!(await fs.pathExists(dir)))
        throw new Error('Invalid directory path.');

      const failedPath = path.join(this.params.dir, 'failed');
      const outputPath = path.join(this.params.dir, 'output');
      const processedPath = path.join(this.params.dir, 'processed');

      await Promise.all([
        fs.ensureDir(failedPath),
        fs.ensureDir(outputPath),
        fs.ensureDir(processedPath),
      ]);

      const dirContent = await fs.readdir(dir, { withFileTypes: true });

      for (const item of dirContent) {
        const itemPath = path.resolve(dir, item.name);
        if (!item.isFile())
          continue;

        try {
          const rows = await this.processFile(itemPath);

          const filename = path.basename(item.name).replace(path.extname(item.name), '');
          const outputFilename = path.resolve(path.join(outputPath, `${filename}.csv`));
          const processedFilename = path.resolve(path.join(processedPath, `${filename}.json`));

          if (this.params.output === 'database')
            await this.toDatabase(rows);
          else await ImportJsonSubmissions.toCSV(outputFilename, rows);

          await fs.move(itemPath, processedFilename);
        }
        catch (err) {
          logger.error(err);
          const failedFilename = path.resolve(path.join(failedPath, item.name));
          await fs.move(itemPath, failedFilename);
        }
      }
    }
    finally {
      this.pgClients.foods.release();
      this.pgClients.system.release();
      await this.closeMSPool();
    }

    const { message } = this;
    logger.info(message);

    return { message };
  }

  /**
   * Load food group entries from intake24
   *
   * @param {string} localeId
   * @memberof ImportJsonSubmissions
   */
  async loadFoodGroups(localeId: string) {
    const result = await this.pgClients.foods.query<FoodGroup>(
      `SELECT fg.id, fg.description as "englishName", fgl.local_description as "localName" FROM food_groups fg
        LEFT JOIN food_groups_local fgl ON fg.id = fgl.food_group_id AND fgl.locale_id = $1
        ORDER BY fg.id;`,
      [localeId],
    );

    this.foodGroups = result.rows.reduce<FoodGroups>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }

  /**
   * Load nutrient entries from intake24
   *
   * @param {string} localeId
   * @memberof ImportJsonSubmissions
   */
  async loadNutrients(localeId: string) {
    const result = await this.pgClients.system.query<Nutrient>(
      `SELECT nt.id, nt.description as name FROM nutrient_types nt
        JOIN local_nutrient_types lnt ON nt.id = lnt.nutrient_type_id AND lnt.locale_id = $1
        ORDER BY lnt.id;`,
      [localeId],
    );

    this.nutrients = result.rows.reduce<Nutrients>((acc, item) => {
      acc[item.id] = item;

      this.fields.push({ label: item.name, value: row => round(row[`nutrientId.${item.id}`]) });

      return acc;
    }, {});
  }

  static async toCSV(filepath: string, content: any[]) {
    const csv = await new AsyncParser({ fields, defaultValue: NA }).parse(content).promise();
    await fs.writeFile(filepath, csv, { encoding: 'utf8' });
  }

  async toDatabase(rows: Row[]) {
    const transformedRows = rows.map(row =>
      fields.map(
        ({ value }) => (typeof value === 'string' ? row[value] : value(row))?.toString() ?? 'N/A',
      ),
    );

    const table = new mssql.Table(this.dbConfig.tables.data);
    this.fields.forEach(column =>
      table.columns.add(
        column.label,
        column.label === 'Survey ID' ? mssql.UniqueIdentifier : mssql.VarChar,
        { nullable: true },
      ),
    );
    transformedRows.forEach(row => table.rows.add(...row));

    const request = this.msPool.request();
    await request.bulk(table);
  }

  /**
   *
   *
   * @private
   * @param {string} file
   * @returns {Promise<void>}
   * @memberof ImportJsonSubmissions
   */
  private async processFile(file: string): Promise<Row[]> {
    const content = await fs.readFile(file, 'utf8');
    const data: SubmissionData = JSON.parse(content);

    const rows = [];

    for (const submission of data.intake_data) {
      const {
        id: submissionId,
        userId,
        startTime,
        endTime,
        meals,
        userAlias: [userName],
        userCustomData: {
          country,
          interviewerId,
          participantAge,
          interviewerName,
          interviewerTeamID,
          participantGender,
          interviewerTeamName,
        },
        surveyCustomData: {
          diet,
          cookingOil,
          foodAmount,
          foodAmountReason,
          supplements,
          diffInterviewer,
          diffParticipant,
        },
      } = submission;

      const mins = Math.round((Date.parse(endTime) - Date.parse(startTime)) / 1000 / 60);
      const timeToComplete = `${mins} min`;

      let mealIdx = 0;
      // Meal
      for (const meal of meals) {
        const {
          id: mealId,
          name: mealName,
          time: { hours, minutes },
          customData: { foodSource },
          foods,
          missingFoods,
        } = meal;

        mealIdx++;

        const mealTime = `${hours}:${minutes || '00'}`;

        let foodIdx = 0;

        const baseRow = {
          // Submission
          submissionId,
          userId,
          startTime,
          endTime,
          timeToComplete,
          userName,
          // User custom
          country,
          interviewerId,
          participantAge,
          interviewerName,
          interviewerTeamID,
          participantGender,
          interviewerTeamName,
          // Survey custom
          diet,
          cookingOil,
          foodAmount,
          foodAmountReason,
          supplements,
          diffInterviewer,
          diffParticipant,
          // Meal
          mealIdx,
          mealId,
          mealName,
          mealTime,
          // Meal custom
          foodSource,
        };

        // Food
        for (const food of foods) {
          const {
            id: foodId,
            code: foodCode,
            brand,
            fields: { sub_group_code: subGroupCode },
            searchTerm,
            foodGroupId,
            isReadyMeal,
            nutrientTableId,
            localDescription: [description],
            reasonableAmount,
            nutrientTableCode,
            englishDescription,
            customData: { servingWeightFactor },
            nutrients,
            portionSize: {
              data: { servingImage, leftoversImage },
              portionWeight,
              servingWeight,
              leftoversWeight,
            },
          } = food;

          foodIdx++;

          const foodGroupEnglishName = this.foodGroups[foodGroupId].englishName;
          const foodGroupLocalName = this.foodGroups[foodGroupId].localName;

          const nutrientMap = Object.entries(nutrients).reduce<Record<string, number>>(
            (acc, [nutrientId, value]) => {
              acc[`nutrientId.${nutrientId}`] = value;
              return acc;
            },
            {},
          );

          const row = {
            ...baseRow,
            // Food
            foodIdx,
            foodId,
            foodCode,
            brand,
            subGroupCode,
            searchTerm,
            foodGroupId,
            foodGroupEnglishName,
            foodGroupLocalName,
            isReadyMeal,
            nutrientTableId,
            description,
            reasonableAmount,
            nutrientTableCode,
            englishDescription,
            // Food custom
            servingWeightFactor,
            // PSM
            portionWeight,
            servingWeight,
            servingImage,
            leftoversWeight,
            leftoversImage,
            // Nutrients
            ...nutrientMap,
          };

          rows.push(row);
        }

        // Missing food
        for (const missingFood of missingFoods) {
          const {
            id: missingFoodId,
            name: searchTerm,
            brand,
            description: missingFoodDescription,
            portionSize: missingFoodPortionSize,
            leftovers: missingFoodLeftovers,
          } = missingFood;

          foodIdx++;

          const row = {
            ...baseRow,
            // Missing food
            foodIdx,
            foodCode: MISSING_FOOD_CODE,
            brand,
            searchTerm,
            missingFoodId,
            missingFoodDescription,
            missingFoodPortionSize,
            missingFoodLeftovers,
          };

          rows.push(row);
        }
      }
    }

    return rows;
  }
}
