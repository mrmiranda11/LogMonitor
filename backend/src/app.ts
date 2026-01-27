import express from 'express';
import MonitorRoutes from './routes/MonitorRoutes';
import cors from 'cors';

const allowedOrigins=[
    'http://localhost:5174'
];
const app = express();

app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({ extended: true }));

app.use(cors({origin:allowedOrigins,credentials: true}));
app.use('/',MonitorRoutes);


const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});