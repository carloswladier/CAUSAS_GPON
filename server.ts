import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory or file-backed database configuration
const CONFIG_FILE = path.join(__dirname, '.db_config.json');

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function getStoredDbConfig(): DbConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (data.host && data.user && data.database) {
        return data;
      }
    } catch (e) {
      console.error('Error reading db config file:', e);
    }
  }

  return {
    host: process.env.HOSTINGER_DB_HOST || '',
    port: parseInt(process.env.HOSTINGER_DB_PORT || '3306', 10),
    user: process.env.HOSTINGER_DB_USER || '',
    password: process.env.HOSTINGER_DB_PASSWORD || '',
    database: process.env.HOSTINGER_DB_NAME || '',
  };
}

let activePool: mysql.Pool | null = null;
let lastConfigHash = '';

function getPool(config: DbConfig): mysql.Pool | null {
  if (!config.host || !config.user || !config.database) {
    return null;
  }

  const hash = `${config.host}:${config.port}:${config.user}:${config.database}:${config.password}`;
  if (activePool && lastConfigHash === hash) {
    return activePool;
  }

  if (activePool) {
    activePool.end().catch(() => {});
  }

  lastConfigHash = hash;
  activePool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 8000,
  });

  return activePool;
}

async function ensureVisitasTable(pool: mysql.Pool) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS visitas_tecnicas (
      id VARCHAR(64) PRIMARY KEY,
      contrato VARCHAR(64) NOT NULL,
      tecnico VARCHAR(128) NOT NULL,
      nap_dio_fisica VARCHAR(128),
      nap_igual_toa VARCHAR(10) NOT NULL,
      obs_nap TEXT,
      falhas TEXT,
      outros_falha TEXT,
      potencia_nap VARCHAR(32),
      potencia_ont VARCHAR(32),
      perda_drop VARCHAR(32),
      observacoes TEXT,
      latitude DECIMAL(11, 8),
      longitude DECIMAL(11, 8),
      endereco_localizacao TEXT,
      fotos_count INT DEFAULT 0,
      fotos_json LONGTEXT,
      status VARCHAR(32) DEFAULT 'concluido',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_contrato (contrato),
      INDEX idx_tecnico (tecnico),
      INDEX idx_created_at (created_at),
      INDEX idx_coords (latitude, longitude)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.query(createTableQuery);
}

// ================= API ROUTES =================

// 1. Check DB Status
app.get('/api/db/status', async (req: Request, res: Response) => {
  const config = getStoredDbConfig();
  if (!config.host || !config.user || !config.database) {
    return res.json({
      connected: false,
      configured: false,
      message: 'Banco Hostinger não configurado. Adicione os dados de conexão.',
      config: {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
      },
    });
  }

  try {
    const pool = getPool(config);
    if (!pool) {
      return res.json({
        connected: false,
        configured: true,
        message: 'Configuração incompleta.',
      });
    }

    const [rows] = await pool.query('SELECT 1 as is_alive');
    await ensureVisitasTable(pool);

    return res.json({
      connected: true,
      configured: true,
      message: 'Conectado ao MySQL Hostinger com sucesso!',
      config: {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
      },
    });
  } catch (error: any) {
    console.error('Hostinger DB Error:', error.message);
    return res.json({
      connected: false,
      configured: true,
      message: `Erro ao conectar: ${error.message}. Lembre-se de liberar o IP em 'MySQL Remoto' no hPanel da Hostinger.`,
      config: {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
      },
    });
  }
});

// 2. Test Connection with custom parameters
app.post('/api/db/test', async (req: Request, res: Response) => {
  const { host, port, user, password, database } = req.body;
  if (!host || !user || !database) {
    return res.status(400).json({ success: false, message: 'Host, Usuário e Nome do Banco são obrigatórios.' });
  }

  try {
    const tempPool = mysql.createPool({
      host,
      port: parseInt(port || '3306', 10),
      user,
      password: password || '',
      database,
      connectTimeout: 8000,
    });

    await tempPool.query('SELECT 1 as test');
    await ensureVisitasTable(tempPool);
    await tempPool.end();

    return res.json({
      success: true,
      message: 'Conexão com Hostinger MySQL validada com sucesso! Tabela "visitas_tecnicas" verificada.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Falha na conexão: ${err.message}. Verifique credenciais e a liberação de 'MySQL Remoto' no hPanel.`,
    });
  }
});

// 3. Save DB Configuration
app.post('/api/db/config', async (req: Request, res: Response) => {
  const { host, port, user, password, database } = req.body;
  if (!host || !user || !database) {
    return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes.' });
  }

  const configToSave: DbConfig = {
    host,
    port: parseInt(port || '3306', 10),
    user,
    password: password || '',
    database,
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2), 'utf-8');
    getPool(configToSave); // refresh pool
    return res.json({ success: true, message: 'Configurações do banco salvas com sucesso!' });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: `Erro ao salvar: ${e.message}` });
  }
});

// 4. Save Visit to Hostinger MySQL
app.post('/api/visitas', async (req: Request, res: Response) => {
  const visit = req.body;
  const config = getStoredDbConfig();

  // If DB is configured, save to MySQL
  if (config.host && config.user && config.database) {
    try {
      const pool = getPool(config);
      if (pool) {
        await ensureVisitasTable(pool);

        const id = visit.id || `visit_${Date.now()}`;
        const contrato = visit.contractNumber || visit.contrato || '';
        const tecnico = visit.technicianName || visit.tecnico || '';
        const napDio = visit.physicalNapDio || visit.nap_dio_fisica || '';
        const napIgualToa = visit.isNapEqualToToa || visit.nap_igual_toa || '';
        const obsNap = visit.napObservation || visit.obs_nap || '';
        const falhas = Array.isArray(visit.selectedFaults)
          ? visit.selectedFaults.join('; ')
          : visit.falhas || '';
        const outrosFalha = visit.otherFaultDescription || visit.outros_falha || '';
        const potNap = visit.napPower || visit.potencia_nap || '';
        const potOnt = visit.ontPower || visit.potencia_ont || '';
        const perdaDrop = visit.perdaDrop || '';
        const observacoes = visit.generalObservations || visit.observacoes || '';
        const lat = visit.locationCoords?.latitude || visit.latitude || null;
        const lng = visit.locationCoords?.longitude || visit.longitude || null;
        const endereco = visit.locationAddress || visit.endereco_localizacao || '';
        const fotosCount = visit.photos ? visit.photos.length : visit.fotos_count || 0;
        
        // Strip heavy base64 for lighter MySQL rows or save metadata
        const fotosJson = visit.photos
          ? JSON.stringify(
              visit.photos.map((p: any) => ({
                id: p.id,
                tag: p.tag,
                timestamp: p.timestamp,
                // Include preview thumbnail or full data
                dataUrl: p.dataUrl ? p.dataUrl.slice(0, 150) + '...' : undefined,
              }))
            )
          : '[]';

        const insertQuery = `
          INSERT INTO visitas_tecnicas (
            id, contrato, tecnico, nap_dio_fisica, nap_igual_toa,
            obs_nap, falhas, outros_falha, potencia_nap, potencia_ont,
            perda_drop, observacoes, latitude, longitude, endereco_localizacao,
            fotos_count, fotos_json, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            contrato = VALUES(contrato),
            tecnico = VALUES(tecnico),
            nap_dio_fisica = VALUES(nap_dio_fisica),
            nap_igual_toa = VALUES(nap_igual_toa),
            obs_nap = VALUES(obs_nap),
            falhas = VALUES(falhas),
            outros_falha = VALUES(outros_falha),
            potencia_nap = VALUES(potencia_nap),
            potencia_ont = VALUES(potencia_ont),
            perda_drop = VALUES(perda_drop),
            observacoes = VALUES(observacoes),
            latitude = VALUES(latitude),
            longitude = VALUES(longitude),
            endereco_localizacao = VALUES(endereco_localizacao),
            fotos_count = VALUES(fotos_count),
            fotos_json = VALUES(fotos_json);
        `;

        await pool.query(insertQuery, [
          id,
          contrato,
          tecnico,
          napDio,
          napIgualToa,
          obsNap,
          falhas,
          outrosFalha,
          potNap,
          potOnt,
          perdaDrop,
          observacoes,
          lat,
          lng,
          endereco,
          fotosCount,
          fotosJson,
          visit.status || 'concluido',
        ]);

        return res.json({
          success: true,
          savedToMysql: true,
          message: 'Visita técnica salva com sucesso no banco de dados da Hostinger!',
          id,
        });
      }
    } catch (err: any) {
      console.error('Error saving to Hostinger MySQL:', err);
      return res.status(500).json({
        success: false,
        savedToMysql: false,
        message: `Falha ao gravar no MySQL da Hostinger: ${err.message}`,
      });
    }
  }

  // Fallback if DB not configured
  return res.json({
    success: true,
    savedToMysql: false,
    message: 'Salvo em buffer local (Hostinger MySQL não configurado)',
  });
});

// 5. Get Visits for Dashboard and Heatmap
app.get('/api/visitas', async (req: Request, res: Response) => {
  const config = getStoredDbConfig();
  if (config.host && config.user && config.database) {
    try {
      const pool = getPool(config);
      if (pool) {
        await ensureVisitasTable(pool);
        const [rows] = await pool.query(`
          SELECT 
            id, contrato, tecnico, nap_dio_fisica, nap_igual_toa,
            obs_nap, falhas, outros_falha, potencia_nap, potencia_ont,
            perda_drop, observacoes, latitude, longitude, endereco_localizacao,
            fotos_count, status, created_at
          FROM visitas_tecnicas
          ORDER BY created_at DESC
          LIMIT 200
        `);

        return res.json({
          success: true,
          source: 'hostinger_mysql',
          data: rows,
        });
      }
    } catch (err: any) {
      console.error('Error querying visits:', err);
      return res.status(500).json({ success: false, message: err.message, data: [] });
    }
  }

  return res.json({
    success: true,
    source: 'local',
    data: [],
    message: 'Banco Hostinger não configurado.',
  });
});

// Setup Vite in Dev or Static in Production
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
