import app from '../src/app.js';
import { connectDatabase } from '../src/database/connection.js';

export default async function handler(req, res) {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (err) {
    console.error('Failed to handle request on Vercel:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Serverless execution failed: ' + (err.message || 'Internal Error')
      }
    });
  }
}
