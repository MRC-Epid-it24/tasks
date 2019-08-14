import sql from 'mssql';

export default {
  tables: {
    data: 'tblIntake24Import',
    log: 'tblImportLogAuto'
  },

  fields: [
    { id: 'survey_id', name: 'Survey ID', type: sql.VarChar(200), opt: { nullable: false } },
    { id: 'user_id', name: 'User ID', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'start_time', name: 'Start time', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'submission_time',
      name: 'Submission time',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'time_to_complete',
      name: 'Time to complete',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'cooking_oil_used',
      name: 'Cooking oil used',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'diet', name: 'Diet', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'supplements', name: 'Supplements', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'food_amount', name: 'Food amount', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'reason_for_unusual_food_amount',
      name: 'Reason for unusual food amount',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'meal_id', name: 'Meal ID', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'meal_name', name: 'Meal name', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'food_source', name: 'Food source', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'food_id', name: 'Food ID', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'search_term', name: 'Search term', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'intake_24_food_code',
      name: 'Intake24 food code',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'description_en',
      name: 'Description (en)',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'description_local',
      name: 'Description (local)',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'nutrient_table_name',
      name: 'Nutrient table name',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'nutrient_table_code',
      name: 'Nutrient table code',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'food_group_code',
      name: 'Food group code',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'food_group_en',
      name: 'Food group (en)',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'food_group_local',
      name: 'Food group (local)',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'ready_meal', name: 'Ready meal', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'brand', name: 'Brand', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'as_served_weight_factor',
      name: 'As served weight factor',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'serving_size_g_ml',
      name: 'Serving size (g/ml)',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'serving_image',
      name: 'Serving image',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'leftovers_g_ml',
      name: 'Leftovers (g/ml)',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'leftovers_image',
      name: 'Leftovers image',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'portion_size_g_ml',
      name: 'Portion size (g/ml)',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'reasonable_amount',
      name: 'Reasonable amount',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'missing_food_description',
      name: 'Missing food description',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'missing_food_portion_size',
      name: 'Missing food portion size',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'missing_food_leftovers',
      name: 'Missing food leftovers',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'energy_kcal', name: 'Energy (kcal)', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'fat', name: 'Fat', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'satd_fa', name: 'Satd FA', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'protein', name: 'Protein', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'carbohydrate', name: 'Carbohydrate', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'total_sugars', name: 'Total sugars', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'non_milk_extrinsic_sugars',
      name: 'Non-milk extrinsic sugars',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'alcohol', name: 'Alcohol', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'fibre_water_insoluble',
      name: 'Fibre, water-insoluble',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'fibre_water_soluble',
      name: 'Fibre, water-soluble',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'vitamin_c', name: 'Vitamin C', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'calcium', name: 'Calcium', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'iron', name: 'Iron', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'alpha_carotene',
      name: 'Alpha-carotene',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'beta_cryptoxanthin',
      name: 'Beta cryptoxanthin',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'beta_carotene',
      name: 'Beta-carotene',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'biotin', name: 'Biotin', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'chloride', name: 'Chloride', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'cholesterol', name: 'Cholesterol', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'cis_mon_fa', name: 'Cis-Mon FA', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'cis_n_3_fa', name: 'Cis-n3 FA', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'cis_n_6_fa', name: 'Cis-n6 FA', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'copper', name: 'Copper', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'energy_k_j', name: 'Energy (kJ)', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'englyst_fibre',
      name: 'Englyst fibre',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'folate', name: 'Folate', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'fructose', name: 'Fructose', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'glucose', name: 'Glucose', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'haem_iron', name: 'Haem iron', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'intrinsic_and_milk_sugars',
      name: 'Intrinsic and milk sugars',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'iodine', name: 'Iodine', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'lactose', name: 'Lactose', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'magnesium', name: 'Magnesium', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'maltose', name: 'Maltose', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'manganese', name: 'Manganese', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'niacin', name: 'Niacin', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'niacin_equivalent',
      name: 'Niacin equivalent',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'nitrogen_conversion_factor',
      name: 'Nitrogen conversion factor',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'non_haem_iron',
      name: 'Non-haem iron',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'other_sugars_uk',
      name: 'Other sugars (UK)',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'pantothenic_acid',
      name: 'Pantothenic acid',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'phosphorus', name: 'Phosphorus', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'potassium', name: 'Potassium', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'retinol', name: 'Retinol', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'riboflavin', name: 'Riboflavin', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'selenium', name: 'Selenium', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'sodium', name: 'Sodium', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'southgate_fibre',
      name: 'Southgate fibre',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'starch', name: 'Starch', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'sucrose', name: 'Sucrose', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'thiamin', name: 'Thiamin', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'total_carotene',
      name: 'Total carotene',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    {
      id: 'total_nitrogen',
      name: 'Total nitrogen',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'trans_fa', name: 'Trans FA', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'tryptophan_60',
      name: 'Tryptophan/60',
      type: sql.VarChar(200),
      opt: { nullable: true }
    },
    { id: 'vitamin_a', name: 'Vitamin A', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'vitamin_b_12', name: 'Vitamin B12', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'vitamin_b_6', name: 'Vitamin B6', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'vitamin_d', name: 'Vitamin D', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'vitamin_e', name: 'Vitamin E', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'water', name: 'Water', type: sql.VarChar(200), opt: { nullable: true } },
    { id: 'zinc', name: 'Zinc', type: sql.VarChar(200), opt: { nullable: true } },
    {
      id: 'co₂_emissions',
      name: 'CO₂ emissions',
      type: sql.VarChar(200),
      opt: { nullable: true }
    }
  ]
};
