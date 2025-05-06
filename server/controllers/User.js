const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { createError } = require("../error.js");
const User = require("../models/User.js");
const Workout = require("../models/Workout.js");

dotenv.config();

const UserRegister = async (req, res, next) => {
  try {
    const { email, password, name, img } = req.body;

    // Check if the email is in use
    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return next(createError(409, "Email is already in use."));
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const user = new User({  
      name,
      email,
      password: hashedPassword,
      img,
    });

    const createdUser = await user.save();
    const token = jwt.sign({ id: createdUser._id }, process.env.JWT, {
      expiresIn: "3650d",
    });

    return res.status(200).json({ token, user });
  } catch (error) {
    return next(error);
  }
};

const UserLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email });

    // Check if user exists
    if (!user) {
      return next(createError(404, "User not found"));
    }

    // Check if password is correct
    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    
    if (!isPasswordCorrect) {
      return next(createError(403, "Incorrect password"));
    }
   
    const token = jwt.sign({ id: user._id }, process.env.JWT, {
      expiresIn: "3650d",
    });

    return res.status(200).json({ token, user });
  } catch (error) {
    return next(error);
  }
};

const getUserDashboard = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      return next(createError(404, "User not found"));
    }

    const currentDateFormatted = new Date();
    const startToday = new Date(
      currentDateFormatted.getFullYear(),
      currentDateFormatted.getMonth(),
      currentDateFormatted.getDate()
    );
    const endToday = new Date(
      currentDateFormatted.getFullYear(),
      currentDateFormatted.getMonth(),
      currentDateFormatted.getDate() + 1
    );

    // Calculate total calories burnt
    const totalCaloriesBurnt = await Workout.aggregate([
      { $match: { user: user._id, date: { $gte: startToday, $lt: endToday } } },
      {
        $group: {
          _id: null,
          totalCaloriesBurnt: { $sum: "$caloriesBurned" },
        },
      },
    ]);

    // Calculate total number of workouts
    const totalWorkouts = await Workout.countDocuments({
      user: userId,
      date: { $gte: startToday, $lt: endToday },
    });

    // Calculate average calories burnt per workout
    const avgCaloriesBurntPerWorkout =
      totalCaloriesBurnt.length > 0
        ? totalCaloriesBurnt[0].totalCaloriesBurnt / totalWorkouts
        : 0;

    // Fetch category of workouts
    const categoryCalories = await Workout.aggregate([
      { $match: { user: user._id, date: { $gte: startToday, $lt: endToday } } },
      {
        $group: {
          _id: "$category",
          totalCaloriesBurnt: { $sum: "$caloriesBurned" },
        },
      },
    ]);

    // Format category data for pie chart
    const pieChartData = categoryCalories.map((category, index) => ({
      id: index,
      value: category.totalCaloriesBurnt,
      label: category._id,
    }));

    return res.status(200).json({
      totalCaloriesBurnt:
        totalCaloriesBurnt.length > 0
          ? totalCaloriesBurnt[0].totalCaloriesBurnt
          : 0,
      totalWorkouts: totalWorkouts,
      avgCaloriesBurntPerWorkout: avgCaloriesBurntPerWorkout,
      pieChartData: pieChartData,
    });
  } catch (err) {
    next(err);
  }
};

const getWorkoutsByDate = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    let date = req.query.date ? new Date(req.query.date) : new Date();
    if (!user) {
      return next(createError(404, "User not found"));
    }

    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const endOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1
    );

    const todaysWorkouts = await Workout.find({
      user: userId,
      date: { $gte: startOfDay, $lt: endOfDay },
    });

    const totalCaloriesBurnt = todaysWorkouts.reduce(
      (total, workout) => total + workout.caloriesBurned,
      0
    );

    return res.status(200).json({ todaysWorkouts, totalCaloriesBurnt });
  } catch (err) {
    next(err);
  }
};

const addWorkout = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const {workoutString}  = req.body;
    if (!workoutString) {
      return next(createError(400, "Workout string is missing"));
    }

    const categories = workoutString.category.split(",");
    if (categories.length === 0) {
      return next(createError(400, "No categories found in workout string"));
    }

    const parsedWorkouts =[];

    if(Object.keys(workoutString).length<5){
      return next(createError(400,"Workout string is missing for count the workout"));
    }
    if(Object.keys(workoutString).length<=5){
      return next(createError(400,"Please enter in proper format"));
    }
    if(workoutString){
      parsedWorkouts.push(workoutString);
    }
    else{
      return next(createError(400,"Workout string is missing for count the workout"));
    }
    parsedWorkouts.forEach(async (workout) => {
      workout.caloriesBurned = calculateCaloriesBurnt(workout);
      await Workout.create({ ...workout, user: userId });
    });

    return res.status(201).json({
      message: "Workouts added successfully",
      workouts: parsedWorkouts,
    });
  } catch (err) {
    next(err);
  }
};

const parseWorkoutLine = (parts) => {
  if (parts.length >= 5) {
    return {
      workoutName: parts[1].substring(1).trim(),
      sets: parseInt(parts[2].split("sets")[0].substring(1).trim()),
      reps: parseInt(parts[2].split("sets")[1].split("reps")[0].substring(1).trim()),
      weight: parseFloat(parts[3].split("kg")[0].substring(1).trim()),
      duration: parseFloat(parts[4].split("min")[0].substring(1).trim()),
    };
  }
  return null;
};

const calculateCaloriesBurnt = (workoutDetails) => {
  const caloriesBurntPerMinute = 5;
  return workoutDetails.duration * caloriesBurntPerMinute * workoutDetails.weight;
};

// Exporting functions
module.exports = {
  UserRegister,
  UserLogin,
  getUserDashboard,
  getWorkoutsByDate,
  addWorkout
};
