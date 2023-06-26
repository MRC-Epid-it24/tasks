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

export const NA = 'N/A';

export const MISSING_FOOD_CODE = 'MISSING';

export type Food = {
  id: number;
  code: string;
  brand: string;
  fields: Record<string, string>;
  nutrients: Record<string, number>;
  customData: Record<string, string>;
  searchTerm: string;
  foodGroupId: number;
  isReadyMeal: boolean;
  portionSize: {
    data: {
      imageUrl: string;
      fillLevel: string;
      leftovers: string;
      'drinkware-id': string;
      servingWeight: string;
      servingImage: string;
      containerIndex: string;
      leftoversLevel: string;
      leftoversWeight: string;
      leftoversImage: string;
      'skip-fill-level': string;
      'initial-fill-level': string;
    };
    method: string;
    portionWeight: number;
    servingWeight: number;
    leftoversWeight: number;
  };
  nutrientTableId: string;
  localDescription: [string];
  reasonableAmount: boolean;
  nutrientTableCode: string;
  englishDescription: string;
};

export type MissingFood = {
  id: number;
  name: string;
  brand: string;
  description: string;
  portionSize: string;
  leftovers: string;
};

export type Meals = {
  id: number;
  name: string;
  time: {
    hours: number;
    minutes: number;
  };
  customData: Record<string, string>;
  foods: Food[];
  missingFoods: MissingFood[];
};

export type Submission = {
  id: string;
  meals: Meals[];
  userId: number;
  endTime: string;
  startTime: string;
  userAlias: [string];
  userCustomData: Record<string, string>;
  surveyCustomData: Record<string, string>;
};

export type SubmissionData = {
  meta: {
    end_time: string;
    start_time: string;
    collected_by: string;
  };
  intake_url: string;
  intake_data: Submission[];
};
