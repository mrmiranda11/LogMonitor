import { Router,Request,Response } from "express";
import { MonitorController } from "../controllers/MonitorController";

const router = Router();
const monitorController = new MonitorController();

router.get('/get', async (req, res) => {
  try {
    res.status(200).json({ error: "200" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });

  }
});

router.post('/read',async (req: Request,res:Response)=>{
    await monitorController.readLog(req,res);
})

export default router;