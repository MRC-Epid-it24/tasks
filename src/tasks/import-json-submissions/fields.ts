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

export type Field = { label: string; value: string | ((row: any) => any) };

export function round(value: any) {
  return typeof value === 'number' ? Math.round(value * 100) / 100 : value;
}

export const fields: Field[] = [
  { label: 'Survey ID', value: 'submissionId' },
  { label: 'User ID', value: 'userName' },
  { label: 'Interviewer ID', value: 'interviewerId' },
  { label: 'Interviewer Name', value: 'interviewerName' },
  { label: 'Interviewer Team ID', value: 'interviewerTeamID' },
  { label: 'Interviewer Team Name', value: 'interviewerTeamName' },
  { label: 'Participant Age', value: 'participantAge' },
  { label: 'Participant Gender', value: 'participantGender' },
  { label: 'Country', value: 'country' },
  { label: 'Start time', value: 'startTime' },
  { label: 'Submission time', value: 'endTime' },
  { label: 'Time to complete', value: 'timeToComplete' },
  { label: 'Cooking oil used', value: 'cookingOil' },
  { label: 'Diet', value: 'diet' },
  { label: 'Supplements', value: 'supplements' },
  { label: 'Food amount', value: 'foodAmount' },
  { label: 'Reason for unusual food amount', value: 'foodAmountReason' },
  { label: 'Participant difficulties', value: 'diffParticipant' },
  { label: 'Interviewer difficulties', value: 'diffInterviewer' },
  { label: 'Meal Index', value: 'mealIdx' },
  { label: 'Meal ID', value: 'mealId' },
  { label: 'Meal name', value: 'mealName' },
  { label: 'Meal time', value: 'mealTime' },
  { label: 'Food source', value: 'foodSource' },
  { label: 'Food Index', value: 'foodIdx' },
  { label: 'Search term', value: 'searchTerm' },
  { label: 'Food ID', value: 'foodId' },
  { label: 'Intake24 food code', value: 'foodCode' },
  { label: 'Description (en)', value: 'englishDescription' },
  { label: 'Description (local)', value: 'description' },
  { label: 'Nutrient table name', value: 'nutrientTableId' },
  { label: 'Nutrient table code', value: 'nutrientTableCode' },
  { label: 'Food group code', value: 'foodGroupId' },
  { label: 'Food group (en)', value: 'foodGroupEnglishName' },
  { label: 'Food group (local)', value: 'foodGroupLocalName' },
  { label: 'Ready meal', value: 'isReadyMeal' },
  { label: 'Brand', value: 'brand' },
  { label: 'As served weight factor', value: 'servingWeightFactor' },
  { label: 'Serving size (g/ml)', value: item => round(item.servingWeight) },
  { label: 'Serving image', value: 'servingImage' },
  { label: 'Leftovers (g/ml)', value: item => round(item.leftoversWeight) },
  { label: 'Leftovers image', value: 'leftoversImage' },
  { label: 'Portion size (g/ml)', value: item => round(item.portionWeight) },
  { label: 'Reasonable amount', value: 'reasonableAmount' },
  { label: 'Missing food ID', value: 'missingFoodId' },
  { label: 'Missing food description', value: 'missingFoodDescription' },
  { label: 'Missing food portion size', value: 'missingFoodPortionSize' },
  { label: 'Missing food leftovers', value: 'missingFoodLeftovers' },
  { label: 'Sub group code', value: 'subGroupCode' },
];
