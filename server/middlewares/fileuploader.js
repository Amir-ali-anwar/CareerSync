import multer from "multer";
import path from "path";
import fs from "fs";


const uploadDir = path.join("uploads", "cvs");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, "uploads/cvs");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadCV = multer({ storage }).single('cv');
export default uploadCV;