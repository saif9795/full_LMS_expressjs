import { app } from "./app.js";
import dotenv from 'dotenv';
import dbConnect from "./db/dbConnect.js";
dotenv.config();


const PORT = process.env.PORT || 8001;

app.get('/', (req, res)=>{
    res.status(200).json({
        success : true,
        message : "Welcome to LMS API"
    })
})

app.listen(PORT, async()=>{
    console.log(`Server is running at http://localhost:${PORT}`);
    await dbConnect();
})