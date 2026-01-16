import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    
});

const Course = mongoose.model("Course", courseSchema);

export default Course;