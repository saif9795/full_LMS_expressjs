import mongoose from "mongoose";

const lessonsSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true,
    },
    contentType:{
        type: String,
        enum: ['video', 'article', "audio", 'quiz'],
    },
    contentUrl:{
        type: String,
    },
},{
    timestamps: true,
});

const Lessons = mongoose.model("Lessons", lessonsSchema);

export default Lessons;