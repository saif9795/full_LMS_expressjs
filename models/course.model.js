import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    courseTitle:{
        type: String,
        required: true,
    },
    description:{
        type: String,
        required: true,
    },
    courseImageUrl:{
        type: String,
    },
    price:{
        type: Number,
        required: true,
    },
    instructor:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    lessons: [
        {
            type: mongoose.Schema.Types.ObjectId,   
            ref: "Lessons",
        }
    ],
},{
    timestamps: true,   
});

const Course = mongoose.model("Course", courseSchema);

export default Course;