import mongoose from "mongoose";

const lessonsSchema = new mongoose.Schema({
    
});

const Lessons = mongoose.model("Lessons", lessonsSchema);

export default Lessons;