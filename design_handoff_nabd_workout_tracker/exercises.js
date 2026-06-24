// Nabḍ exercise library. muscles use heatmap keys.
// {id, name, g(group), p:[primary], s:[secondary], e:equipment, t:true if time-based}
window.EQUIPMENT = [
  {k:'bodyweight', n:'Bodyweight'},
  {k:'dumbbell', n:'Dumbbells'},
  {k:'barbell', n:'Barbell'},
  {k:'ezbar', n:'EZ-bar'},
  {k:'kettlebell', n:'Kettlebell'},
  {k:'bands', n:'Resistance bands'},
  {k:'pullupbar', n:'Pull-up bar'},
  {k:'bench', n:'Bench'},
  {k:'cable', n:'Cable machine'},
  {k:'machine', n:'Plate / pin machines'},
  {k:'smith', n:'Smith machine'}
];

window.GYM_PROFILES = [
  {id:'home', name:'Home rack', equipment:['bodyweight','dumbbell','barbell','ezbar','kettlebell','bands','pullupbar','bench'], track:'weight_reps'},
  {id:'commercial', name:'Commercial gym', equipment:['bodyweight','dumbbell','barbell','ezbar','kettlebell','bands','pullupbar','bench','cable','machine','smith'], track:'weight_reps'},
  {id:'travel', name:'Travel / bands', equipment:['bodyweight','bands','dumbbell'], track:'weight_reps'}
];

window.MUSCLE_GROUPS = ['Chest','Back','Traps','Shoulders','Triceps','Biceps','Forearms','Quads','Hamstrings','Glutes','Calves','Abs'];

window.EXERCISES = [
  // Chest
  {id:'bb-bench', name:'Barbell Bench Press', g:'Chest', p:['chest'], s:['triceps','shoulders'], e:'barbell', track:'weight_reps'},
  {id:'incline-bb-bench', name:'Incline Barbell Press', g:'Chest', p:['chest'], s:['shoulders','triceps'], e:'barbell', track:'weight_reps'},
  {id:'db-bench', name:'Dumbbell Bench Press', g:'Chest', p:['chest'], s:['triceps','shoulders'], e:'dumbbell', track:'weight_reps'},
  {id:'incline-db-press', name:'Incline Dumbbell Press', g:'Chest', p:['chest'], s:['shoulders','triceps'], e:'dumbbell', track:'weight_reps'},
  {id:'pushup', name:'Push-up', g:'Chest', p:['chest'], s:['triceps','shoulders'], e:'bodyweight', track:'bodyweight_reps'},
  {id:'dips', name:'Chest Dip', g:'Chest', p:['chest'], s:['triceps','shoulders'], e:'bodyweight', track:'weighted_bodyweight'},
  {id:'db-fly', name:'Dumbbell Fly', g:'Chest', p:['chest'], s:[], e:'dumbbell', track:'weight_reps'},
  {id:'cable-fly', name:'Cable Fly', g:'Chest', p:['chest'], s:[], e:'cable', track:'weight_reps'},
  {id:'pec-deck', name:'Pec Deck', g:'Chest', p:['chest'], s:[], e:'machine', track:'weight_reps'},
  {id:'smith-incline', name:'Smith Incline Press', g:'Chest', p:['chest'], s:['shoulders','triceps'], e:'smith', track:'weight_reps'},
  {id:'band-press', name:'Band Chest Press', g:'Chest', p:['chest'], s:['triceps'], e:'bands', track:'weight_reps'},

  // Back
  {id:'pullup', name:'Pull-up', g:'Back', p:['back'], s:['biceps'], e:'pullupbar', track:'weighted_bodyweight'},
  {id:'chinup', name:'Chin-up', g:'Back', p:['back'], s:['biceps'], e:'pullupbar', track:'weighted_bodyweight'},
  {id:'lat-pulldown', name:'Lat Pulldown', g:'Back', p:['back'], s:['biceps'], e:'cable', track:'weight_reps'},
  {id:'bb-row', name:'Barbell Row', g:'Back', p:['back'], s:['biceps','traps'], e:'barbell', track:'weight_reps'},
  {id:'pendlay-row', name:'Pendlay Row', g:'Back', p:['back'], s:['biceps'], e:'barbell', track:'weight_reps'},
  {id:'db-row', name:'One-Arm Dumbbell Row', g:'Back', p:['back'], s:['biceps'], e:'dumbbell', track:'weight_reps'},
  {id:'cable-row', name:'Seated Cable Row', g:'Back', p:['back'], s:['biceps'], e:'cable', track:'weight_reps'},
  {id:'csr', name:'Chest-Supported Row', g:'Back', p:['back'], s:['biceps'], e:'machine', track:'weight_reps'},
  {id:'tbar', name:'T-Bar Row', g:'Back', p:['back'], s:['biceps','traps'], e:'barbell', track:'weight_reps'},
  {id:'inverted-row', name:'Inverted Row', g:'Back', p:['back'], s:['biceps'], e:'bodyweight', track:'bodyweight_reps'},
  {id:'band-pulldown', name:'Band Lat Pulldown', g:'Back', p:['back'], s:['biceps'], e:'bands', track:'weight_reps'},
  {id:'straight-arm', name:'Straight-Arm Pulldown', g:'Back', p:['back'], s:[], e:'cable', track:'weight_reps'},
  {id:'deadlift', name:'Deadlift', g:'Back', p:['back','glutes','hamstrings'], s:['traps','lowerBack'], e:'barbell', track:'weight_reps'},

  // Traps
  {id:'bb-shrug', name:'Barbell Shrug', g:'Traps', p:['traps'], s:[], e:'barbell', track:'weight_reps'},
  {id:'db-shrug', name:'Dumbbell Shrug', g:'Traps', p:['traps'], s:[], e:'dumbbell', track:'weight_reps'},
  {id:'face-pull', name:'Face Pull', g:'Traps', p:['traps'], s:['shoulders'], e:'cable', track:'weight_reps'},

  // Shoulders
  {id:'ohp', name:'Overhead Press', g:'Shoulders', p:['shoulders'], s:['triceps'], e:'barbell', track:'weight_reps'},
  {id:'db-shoulder-press', name:'Seated DB Shoulder Press', g:'Shoulders', p:['shoulders'], s:['triceps'], e:'dumbbell', track:'weight_reps'},
  {id:'arnold', name:'Arnold Press', g:'Shoulders', p:['shoulders'], s:['triceps'], e:'dumbbell', track:'weight_reps'},
  {id:'lat-raise', name:'Lateral Raise', g:'Shoulders', p:['shoulders'], s:[], e:'dumbbell', track:'weight_reps'},
  {id:'cable-lat-raise', name:'Cable Lateral Raise', g:'Shoulders', p:['shoulders'], s:[], e:'cable', track:'weight_reps'},
  {id:'rear-fly', name:'Rear Delt Fly', g:'Shoulders', p:['shoulders'], s:[], e:'dumbbell', track:'weight_reps'},
  {id:'reverse-pecdeck', name:'Reverse Pec Deck', g:'Shoulders', p:['shoulders'], s:[], e:'machine', track:'weight_reps'},
  {id:'band-lat-raise', name:'Band Lateral Raise', g:'Shoulders', p:['shoulders'], s:[], e:'bands', track:'weight_reps'},
  {id:'pike-pushup', name:'Pike Push-up', g:'Shoulders', p:['shoulders'], s:['triceps'], e:'bodyweight', track:'bodyweight_reps'},
  {id:'upright-row', name:'Upright Row', g:'Shoulders', p:['shoulders'], s:['traps'], e:'barbell', track:'weight_reps'},

  // Triceps
  {id:'rope-pushdown', name:'Triceps Rope Pushdown', g:'Triceps', p:['triceps'], s:[], e:'cable', track:'weight_reps'},
  {id:'oh-cable-ext', name:'Overhead Cable Extension', g:'Triceps', p:['triceps'], s:[], e:'cable', track:'weight_reps'},
  {id:'skullcrusher', name:'Skull Crusher', g:'Triceps', p:['triceps'], s:[], e:'ezbar', track:'weight_reps'},
  {id:'cgbp', name:'Close-Grip Bench Press', g:'Triceps', p:['triceps'], s:['chest'], e:'barbell', track:'weight_reps'},
  {id:'db-oh-ext', name:'DB Overhead Extension', g:'Triceps', p:['triceps'], s:[], e:'dumbbell', track:'weight_reps'},
  {id:'bench-dip', name:'Bench Dip', g:'Triceps', p:['triceps'], s:[], e:'bodyweight', track:'bodyweight_reps'},
  {id:'band-pushdown', name:'Band Pushdown', g:'Triceps', p:['triceps'], s:[], e:'bands', track:'weight_reps'},

  // Biceps
  {id:'bb-curl', name:'Barbell Curl', g:'Biceps', p:['biceps'], s:[], e:'barbell', track:'weight_reps'},
  {id:'ez-curl', name:'EZ-Bar Curl', g:'Biceps', p:['biceps'], s:[], e:'ezbar', track:'weight_reps'},
  {id:'db-curl', name:'Dumbbell Curl', g:'Biceps', p:['biceps'], s:[], e:'dumbbell', track:'weight_reps'},
  {id:'hammer-curl', name:'Hammer Curl', g:'Biceps', p:['biceps'], s:['forearms'], e:'dumbbell', track:'weight_reps'},
  {id:'incline-curl', name:'Incline DB Curl', g:'Biceps', p:['biceps'], s:[], e:'dumbbell', track:'weight_reps'},
  {id:'cable-curl', name:'Cable Curl', g:'Biceps', p:['biceps'], s:[], e:'cable', track:'weight_reps'},
  {id:'preacher-curl', name:'Preacher Curl', g:'Biceps', p:['biceps'], s:[], e:'machine', track:'weight_reps'},
  {id:'band-curl', name:'Band Curl', g:'Biceps', p:['biceps'], s:[], e:'bands', track:'weight_reps'},

  // Forearms
  {id:'wrist-curl', name:'Wrist Curl', g:'Forearms', p:['forearms'], s:[], e:'dumbbell', track:'weight_reps'},
  {id:'reverse-curl', name:'Reverse Curl', g:'Forearms', p:['forearms'], s:['biceps'], e:'ezbar', track:'weight_reps'},
  {id:'farmer-carry', name:'Farmer Carry', g:'Forearms', p:['forearms'], s:['traps'], e:'dumbbell', t:true, track:'weight_duration'},

  // Quads
  {id:'back-squat', name:'Back Squat', g:'Quads', p:['quads'], s:['glutes','hamstrings'], e:'barbell', track:'weight_reps'},
  {id:'front-squat', name:'Front Squat', g:'Quads', p:['quads'], s:['glutes'], e:'barbell', track:'weight_reps'},
  {id:'goblet-squat', name:'Goblet Squat', g:'Quads', p:['quads'], s:['glutes'], e:'dumbbell', track:'weight_reps'},
  {id:'leg-press', name:'Leg Press', g:'Quads', p:['quads'], s:['glutes'], e:'machine', track:'weight_reps'},
  {id:'bulgarian', name:'Bulgarian Split Squat', g:'Quads', p:['quads'], s:['glutes'], e:'dumbbell', track:'weight_reps'},
  {id:'walking-lunge', name:'Walking Lunge', g:'Quads', p:['quads'], s:['glutes'], e:'dumbbell', track:'weight_reps'},
  {id:'leg-ext', name:'Leg Extension', g:'Quads', p:['quads'], s:[], e:'machine', track:'weight_reps'},
  {id:'hack-squat', name:'Hack Squat', g:'Quads', p:['quads'], s:['glutes'], e:'machine', track:'weight_reps'},
  {id:'smith-squat', name:'Smith Squat', g:'Quads', p:['quads'], s:['glutes'], e:'smith', track:'weight_reps'},
  {id:'bw-squat', name:'Bodyweight Squat', g:'Quads', p:['quads'], s:['glutes'], e:'bodyweight', track:'bodyweight_reps'},
  {id:'step-up', name:'Step-up', g:'Quads', p:['quads'], s:['glutes'], e:'dumbbell', track:'weight_reps'},

  // Hamstrings
  {id:'rdl', name:'Romanian Deadlift', g:'Hamstrings', p:['hamstrings'], s:['glutes','lowerBack'], e:'barbell', track:'weight_reps'},
  {id:'db-rdl', name:'Dumbbell RDL', g:'Hamstrings', p:['hamstrings'], s:['glutes'], e:'dumbbell', track:'weight_reps'},
  {id:'lying-curl', name:'Lying Leg Curl', g:'Hamstrings', p:['hamstrings'], s:[], e:'machine', track:'weight_reps'},
  {id:'seated-curl', name:'Seated Leg Curl', g:'Hamstrings', p:['hamstrings'], s:[], e:'machine', track:'weight_reps'},
  {id:'nordic', name:'Nordic Curl', g:'Hamstrings', p:['hamstrings'], s:[], e:'bodyweight', track:'bodyweight_reps'},
  {id:'good-morning', name:'Good Morning', g:'Hamstrings', p:['hamstrings'], s:['glutes','lowerBack'], e:'barbell', track:'weight_reps'},

  // Glutes
  {id:'hip-thrust', name:'Hip Thrust', g:'Glutes', p:['glutes'], s:['hamstrings'], e:'barbell', track:'weight_reps'},
  {id:'glute-bridge', name:'Glute Bridge', g:'Glutes', p:['glutes'], s:[], e:'bodyweight', track:'bodyweight_reps'},
  {id:'cable-kickback', name:'Cable Kickback', g:'Glutes', p:['glutes'], s:[], e:'cable', track:'weight_reps'},
  {id:'kb-swing', name:'Kettlebell Swing', g:'Glutes', p:['glutes'], s:['hamstrings'], e:'kettlebell', track:'weight_reps'},

  // Calves
  {id:'standing-calf', name:'Standing Calf Raise', g:'Calves', p:['calves'], s:[], e:'machine', track:'weight_reps'},
  {id:'seated-calf', name:'Seated Calf Raise', g:'Calves', p:['calves'], s:[], e:'machine', track:'weight_reps'},
  {id:'db-calf', name:'Dumbbell Calf Raise', g:'Calves', p:['calves'], s:[], e:'dumbbell', track:'weight_reps'},
  {id:'bw-calf', name:'Bodyweight Calf Raise', g:'Calves', p:['calves'], s:[], e:'bodyweight', track:'bodyweight_reps'},

  // Abs
  {id:'plank', name:'Plank', g:'Abs', p:['abs'], s:['obliques'], e:'bodyweight', t:true, track:'duration'},
  {id:'hlr', name:'Hanging Leg Raise', g:'Abs', p:['abs'], s:[], e:'pullupbar', track:'bodyweight_reps'},
  {id:'cable-crunch', name:'Cable Crunch', g:'Abs', p:['abs'], s:[], e:'cable', track:'weight_reps'},
  {id:'ab-wheel', name:'Ab Wheel Rollout', g:'Abs', p:['abs'], s:[], e:'bodyweight', track:'bodyweight_reps'},
  {id:'russian-twist', name:'Russian Twist', g:'Abs', p:['obliques'], s:['abs'], e:'bodyweight', track:'bodyweight_reps'},
  {id:'side-plank', name:'Side Plank', g:'Abs', p:['obliques'], s:[], e:'bodyweight', t:true, track:'duration'},
  {id:'hollow-hold', name:'Hollow Hold', g:'Abs', p:['abs'], s:[], e:'bodyweight', t:true, track:'duration'}
];
