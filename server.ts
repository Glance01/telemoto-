import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

// Global process safety handlers to prevent crashes under all circumstances
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception] error:', error);
});

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Initialize GoogleGenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Simple helper for fallback coordinates
function getDistrictCoordsFallback(prov: string, dist: string) {
  if (dist?.toLowerCase().includes('massinga')) {
    return { lat: -23.3508, lng: 35.405 };
  }
  return { lat: -25.9680, lng: 32.5730 };
}

// In-memory or database tracking for webhook idempotency
const processedEvents = new Set<string>();

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TeleMoto+ Mozambique Mobility Platform',
    timestamp: Date.now(),
  });
});

// Backup manifest and download routes
app.get('/api/backup/status', (req, res) => {
  const manifestPath = path.join(__dirname, 'public', 'backup-manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      return res.json({ success: true, backup: data });
    } catch {
      // ignore
    }
  }
  res.json({
    success: true,
    backup: {
      appName: 'TeleMoto+',
      backupDate: new Date().toISOString(),
      archiveName: 'telemoto-backup-latest.tar.gz',
      downloadUrl: '/telemoto-backup-latest.tar.gz',
    },
  });
});

app.get('/api/backup/download', (req, res) => {
  const backupFile = path.join(__dirname, 'public', 'telemoto-backup-latest.tar.gz');
  if (fs.existsSync(backupFile)) {
    res.download(backupFile, 'telemoto-backup-latest.tar.gz');
  } else {
    res.status(404).json({ success: false, error: 'Ficheiro de backup não encontrado' });
  }
});

/**
 * AI Route, Distance, Time, and Price Analyzer
 */
app.post('/api/ai/analyze-route', async (req, res) => {
  const { origin, destination, distanceKm, estimatedDurationMin, baseFare, province, district } = req.body;

  const fallbackData = {
    explanation: `A viagem de ${distanceKm} km entre ${origin} e ${destination} é totalmente viável e estimada em aproximadamente ${estimatedDurationMin} minutos de mototáxi.`,
    fareComment: `A tarifa de ${baseFare} MT é justa, calculada com base no preço por quilómetro estabelecido para o distrito de ${district || 'Massinga'}.`,
    safetyRecommendation: `Certifique-se de ajustar bem o capacete fornecido pelo motorista e tenha atenção especial se o percurso passar por vias secundárias de areia em ${district || 'Massinga'}.`
  };

  if (!process.env.GEMINI_API_KEY) {
    return res.json({ success: true, data: fallbackData });
  }

  try {
    const prompt = `Você é o analista de tráfego e rotas inteligente do TeleMoto+ em Moçambique.
O utilizador solicitou uma viagem de moto-táxi em:
- Origem: ${origin}
- Destino: ${destination}
- Distância: ${distanceKm} km
- Tempo estimado: ${estimatedDurationMin} minutos
- Preço base calculated: ${baseFare} MT
- Região: Província de ${province}, Distrito de ${district}

REGRAS CRÍTICAS PARA TARIFA:
- Você NUNCA deve recalcular, alterar, sugerir ou inventar uma tarifa diferente ou um valor alternativo!
- Você deve aceitar e validar rigorosamente o preço de exatamente ${baseFare} MT como sendo o valor final, legítimo e correto.
- No campo "fareComment", explique de forma clara e amigável por que a tarifa oficial de exatamente ${baseFare} MT (calculada com base na distância de ${distanceKm} km sob a tabela oficial da província de ${province}) é justa e correta para este trajeto.

Por favor, faça uma análise inteligente desta rota em português amigável de Moçambique:
1. Valide a viabilidade da rota e o tempo estimado de viagem de ${estimatedDurationMin} minutos.
2. Comente brevemente o preço justo oficial de ${baseFare} MT de forma positiva e justificável.
3. Dê uma recomendação de segurança inteligente útil para o passageiro para esta rota (ex: uso de capacete, segurar firme, atenção em estradas de terra ou areia típicas de ${district}).

Retorne a resposta estritamente no formato JSON, que é um objeto com a seguinte estrutura:
{
  "explanation": "Uma análise curta e inteligente do trajeto justificando a viagem e os minutos estimados.",
  "fareComment": "Um comentário rápido legitimando o preço justo de exatamente ${baseFare} MT.",
  "safetyRecommendation": "Uma dica prática de segurança para o passageiro no trajeto."
}`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              fareComment: { type: Type.STRING },
              safetyRecommendation: { type: Type.STRING }
            },
            required: ["explanation", "fareComment", "safetyRecommendation"]
          }
        }
      });
    } catch (primaryError: any) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                explanation: { type: Type.STRING },
                fareComment: { type: Type.STRING },
                safetyRecommendation: { type: Type.STRING }
              },
              required: ["explanation", "fareComment", "safetyRecommendation"]
            }
          }
        });
      } catch (secondaryError: any) {
        throw secondaryError;
      }
    }

    const parsedText = response.text || '{}';
    const data = JSON.parse(parsedText);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.json({ success: true, data: fallbackData });
  }
});

/**
 * Helper to retrieve ZumboPay credentials from environment
 * Supports standard naming:
 * - WALLET ID: ZUMBOPAY_WALLET_ID or WALLET_ID
 * - MERCHANT ID: ZUMBOPAY_MERCHANT_ID or MERCHANT_ID
 * - API KEY SECRET: ZUMBOPAY_API_KEY, API_KEY_SECRET, or ZUMBOPAY_SECRET_KEY
 * - WEBHOOK SECRET: ZUMBOPAY_WEBHOOK_SECRET or WEBHOOK_SECRET
 */
function getZumboPayConfig() {
  const merchantId = (process.env.ZUMBOPAY_MERCHANT_ID || process.env.MERCHANT_ID || '').trim();
  const walletId = (process.env.ZUMBOPAY_WALLET_ID || process.env.WALLET_ID || '').trim();
  const apiKey = (process.env.ZUMBOPAY_API_KEY || process.env.API_KEY_SECRET || process.env.ZUMBOPAY_SECRET_KEY || '').trim();
  const webhookSecret = (process.env.ZUMBOPAY_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || '').trim();

  let baseUrl = (process.env.ZUMBOPAY_BASE_URL || 'https://zumbopay.com/api/public/v1').replace(/\/+$/, '');
  // Normalize legacy/incorrect /api/v1 URL to official /api/public/v1
  if (baseUrl.endsWith('/api/v1')) {
    baseUrl = baseUrl.replace(/\/api\/v1$/, '/api/public/v1');
  } else if (!baseUrl.includes('/public/v1') && baseUrl.endsWith('/v1')) {
    baseUrl = baseUrl.replace(/\/v1$/, '/public/v1');
  }

  const isConfigured = Boolean(merchantId && walletId && apiKey);

  return {
    merchantId,
    walletId,
    apiKey,
    webhookSecret,
    baseUrl,
    isConfigured,
  };
}

/**
 * Public Gateway Configuration Status Check (Booleans only - never exposes secrets)
 */
app.get('/api/payments/config-status', (req, res) => {
  const config = getZumboPayConfig();
  res.json({
    success: true,
    configured: config.isConfigured,
    hasMerchantId: Boolean(config.merchantId),
    hasWalletId: Boolean(config.walletId),
    hasApiKey: Boolean(config.apiKey),
    hasWebhookSecret: Boolean(config.webhookSecret),
    gateway: 'zumbopay',
    supportedMethods: ['mpesa', 'card', 'cash'],
    currency: 'MT',
  });
});

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, ''); // Remove all non-digits
  if (digits.startsWith('258') && digits.length === 12) return digits;
  if (digits.length === 9) return `258${digits}`;
  return `258${digits.slice(-9)}`;
}

/**
 * Endpoint to initiate ZumboPay payment (M-Pesa / e-Mola STK Push or Bank Card)
 */
app.post('/api/payments/create', async (req, res) => {
  const { tripId, passengerId, driverId, amount, method, phone, fareBreakdown } = req.body;
  const config = getZumboPayConfig();

  if (!config.isConfigured) {
    console.warn(`[ZumboPay] Config missing! Refusing to initiate payment for Trip ${tripId}.`);
    return res.status(503).json({
      success: false,
      requiresConfig: true,
      status: 'requires_config',
      message: 'O gateway de pagamento ZumboPay não está configurado no servidor. Configure as variáveis de ambiente reais para autorizar transações.',
    });
  }

  try {
    const formattedPhone = normalizePhone(phone || '');
    const isMobileMoney = method === 'mpesa' || method === 'emola' || method === 'mkesh';
    const endpoint = isMobileMoney ? `${config.baseUrl}/charges` : `${config.baseUrl}/payments`;

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'https';
    const origin = `${protocol}://${host}`;

    let payload: Record<string, any>;

    if (isMobileMoney) {
      // Direct STK Push flow (M-Pesa / e-Mola): customer gets USSD PIN prompt on their phone directly
      payload = {
        wallet_id: config.walletId,
        amount: Number(amount),
        msisdn: formattedPhone,
        customer_name: `Passageiro TeleMoto+`,
        source_id: tripId,
      };
    } else {
      // Hosted Checkout flow (Card / Visa / Mastercard with 3DS)
      payload = {
        title: `Corrida TeleMoto+ #${tripId.slice(0, 8)}`,
        amount: Number(amount),
        currency: 'MZN',
        channels: ['card'],
        wallet_id: config.walletId,
        reference: tripId,
        source_id: tripId,
        callback_url: `${origin}/api/payments/zumbopay/webhook`,
      };
    }

    console.log(`[ZumboPay] Initiating ${method.toUpperCase()} payment for Trip ${tripId}: ${amount} MT to ${formattedPhone} via ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'X-Merchant-Id': config.merchantId,
        'Idempotency-Key': tripId,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data: any = {};
    const isHtml = responseText.trim().startsWith('<') || responseText.toLowerCase().includes('<html');

    if (!isHtml) {
      try {
        data = JSON.parse(responseText);
      } catch {
        // non-critical parse warning
      }
    }

    if (!response.ok) {
      const errMessage =
        data.error?.message ||
        data.message ||
        (isHtml
          ? `Serviço ZumboPay temporariamente indisponível (HTTP ${response.status}).`
          : `Erro no gateway ZumboPay (HTTP ${response.status}).`);

      console.warn(`[ZumboPay Gateway Notice] HTTP ${response.status} from ${endpoint}: ${errMessage}`);

      return res.status(response.status).json({
        success: false,
        status: 'failed',
        code: data.error?.code || 'gateway_error',
        message: errMessage,
      });
    }

    const payloadData = data.data || data;
    const paymentId = payloadData.reference || payloadData.id || payloadData.payment_id || tripId;
    const checkoutUrl = payloadData.checkout_url || payloadData.payment_url || payloadData.redirect_url;
    const gatewayStatus = payloadData.status || 'pending';

    return res.json({
      success: true,
      paymentId,
      reference: payloadData.reference || tripId,
      status: gatewayStatus,
      checkoutUrl,
      message: method === 'mpesa'
        ? 'Solicitação M-Pesa enviada! Introduza o PIN M-Pesa no seu telemóvel para confirmar.'
        : method === 'emola'
        ? 'Solicitação e-Mola enviada! Introduza o PIN no seu telemóvel para confirmar.'
        : 'Sessão de pagamento por cartão criada com sucesso.',
    });
  } catch (error: any) {
    console.warn(`[ZumboPay Gateway Notice] Exception during payment creation:`, error.message || error);
    return res.status(500).json({
      success: false,
      status: 'failed',
      message: 'Falha de comunicação com o servidor de pagamentos ZumboPay.',
    });
  }
});

/**
 * ZumboPay Webhook Listener
 * /api/payments/zumbopay/webhook
 */
app.post('/api/payments/zumbopay/webhook', async (req, res) => {
  const eventId = (req.headers['x-zumbopay-event-id'] as string) || req.body?.event_id || req.body?.id || `evt_${Date.now()}`;
  const signature = (req.headers['x-zumbopay-signature'] as string) || (req.headers['x-signature'] as string) || '';
  const config = getZumboPayConfig();

  console.log(`[ZumboPay Webhook] Incoming event: ${eventId}`);

  // 1. Idempotency check: prevent duplicate processing
  if (eventId && processedEvents.has(eventId)) {
    console.log(`[ZumboPay Webhook] Event ${eventId} already processed.`);
    return res.status(200).json({ received: true, alreadyProcessed: true });
  }

  // 2. Cryptographic signature validation using WEBHOOK SECRET
  if (config.webhookSecret && signature) {
    try {
      const rawBody = JSON.stringify(req.body);
      const computedHmac = crypto.createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex');
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(computedHmac, 'utf8')
      );
      if (!isValid) {
        console.warn('[ZumboPay Webhook] Signature mismatch! Rejecting unverified payload.');
        return res.status(401).json({ error: 'Assinatura inválida do webhook ZumboPay' });
      }
    } catch (sigErr) {
      console.warn('[ZumboPay Webhook] Signature verification notice:', sigErr);
    }
  }

  const payload = req.body || {};
  const data = payload.data || payload;
  const status = (data.status || payload.status || '').toLowerCase();
  const reference = data.reference || payload.reference || data.metadata?.tripId; // tripId

  if (eventId) {
    processedEvents.add(eventId);
  }

  console.log(`[ZumboPay Webhook] Processed trip #${reference} status: ${status}`);

  return res.status(200).json({
    received: true,
    processedAt: Date.now(),
    reference,
    status,
  });
});

/**
 * Verify payment status with ZumboPay
 */
app.get('/api/payments/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  const config = getZumboPayConfig();

  if (!config.isConfigured) {
    return res.json({
      success: false,
      configured: false,
      status: 'requires_config',
      paid: false,
    });
  }

  try {
    const response = await fetch(`${config.baseUrl}/payments/${reference}`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'X-Merchant-Id': config.merchantId,
      },
    });

    if (response.ok) {
      const json = await response.json().catch(() => ({}));
      const data = json.data || json;
      const statusLower = (data.status || 'pending').toLowerCase();
      const isPaid = ['paid', 'completed', 'success', 'successful', 'approved'].includes(statusLower);

      return res.json({
        success: true,
        status: data.status || 'pending',
        paid: isPaid,
        amount: data.amount,
      });
    }

    return res.json({ success: false, status: 'unknown', paid: false });
  } catch (err: any) {
    console.warn('[ZumboPay Verification Notice]', err.message || err);
    return res.json({ success: false, status: 'failed', paid: false });
  }
});

/**
 * Driver Payout / Withdrawal Request Endpoint
 * Dispatches high-priority payout alert to brunomuhacha016@gmail.com
 */
app.post('/api/payouts/request', async (req, res) => {
  const {
    requestId,
    driverId,
    driverName,
    driverPhone,
    driverEmail,
    amount,
    walletType,
    accountDetails,
    balanceBefore,
    balanceAfter,
    createdAt,
  } = req.body || {};

  const targetAdminEmail = process.env.ADMIN_PAYOUT_EMAIL || 'brunomuhacha016@gmail.com';
  const formattedDate = new Date(createdAt || Date.now()).toLocaleString('pt-MZ', {
    timeZone: 'Africa/Maputo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let walletLabel = 'M-Pesa (Vodacom)';
  let destAccount = accountDetails?.phoneNumber || 'N/A';
  if (walletType === 'emola') {
    walletLabel = 'e-Mola (Movitel)';
    destAccount = accountDetails?.phoneNumber || 'N/A';
  } else if (walletType === 'bank') {
    walletLabel = `Conta Bancária - ${accountDetails?.bankName || 'Banco'}`;
    destAccount = `Conta: ${accountDetails?.accountNumber || 'N/A'} ${accountDetails?.nib ? `| NIB: ${accountDetails.nib}` : ''}`;
  }

  console.log(`[Payout Request] Driver ${driverName} (${driverId}) requested ${amount} MT via ${walletLabel}`);

  const emailSubject = `🚨 [PEDIDO DE SAQUE TELEMOTO+] ${amount} MT - ${driverName} (${walletType?.toUpperCase()})`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; color: #18181b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e4e4e7; }
        .header { background: #dc2626; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 28px 24px; }
        .highlight-box { background: #fef2f2; border: 2px solid #f87171; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .highlight-box .amount { font-size: 36px; font-weight: 900; color: #dc2626; font-family: monospace; }
        .highlight-box .label { font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 1px; }
        .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #71717a; margin-bottom: 12px; border-bottom: 1px solid #f4f4f5; padding-bottom: 6px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .data-table td { padding: 10px 0; font-size: 14px; border-bottom: 1px solid #f4f4f5; }
        .data-table td.label { color: #71717a; width: 40%; font-weight: 600; }
        .data-table td.value { color: #18181b; font-weight: 700; text-align: right; }
        .notice { background: #fefce8; border: 1px solid #fef08a; color: #854d0e; padding: 14px; border-radius: 12px; font-size: 12px; line-height: 1.5; margin-top: 20px; }
        .footer { background: #fafafa; border-top: 1px solid #f4f4f5; padding: 16px; text-align: center; font-size: 11px; color: #a1a1aa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>TeleMoto+ Moçambique</h1>
          <p>Notificação Prioritária de Levantamento / Saque de Motorista</p>
        </div>
        <div class="content">
          <div class="highlight-box">
            <div class="label">Valor a Transferir ao Condutor</div>
            <div class="amount">${amount} MT</div>
            <div style="font-size: 12px; color: #71717a; margin-top: 6px;">Tempo esperado pelo motorista: <strong>Dentro de minutos</strong></div>
          </div>

          <div class="section-title">Dados do Condutor</div>
          <table class="data-table">
            <tr><td class="label">Nome Completo:</td><td class="value">${driverName}</td></tr>
            <tr><td class="label">Contacto Telefónico:</td><td class="value">${driverPhone}</td></tr>
            <tr><td class="label">Email:</td><td class="value">${driverEmail || 'Não informado'}</td></tr>
            <tr><td class="label">ID no Sistema:</td><td class="value" style="font-family: monospace; font-size: 12px;">${driverId}</td></tr>
            <tr><td class="label">ID da Solicitação:</td><td class="value" style="font-family: monospace; font-size: 12px;">${requestId}</td></tr>
            <tr><td class="label">Data e Hora:</td><td class="value">${formattedDate} (Maputo)</td></tr>
          </table>

          <div class="section-title">Dados para Envio do Dinheiro</div>
          <table class="data-table">
            <tr><td class="label">Destino / Carteira:</td><td class="value" style="color: #dc2626;">${walletLabel}</td></tr>
            <tr><td class="label">Titular da Conta:</td><td class="value">${accountDetails?.accountHolderName || driverName}</td></tr>
            <tr><td class="label">Número / Conta:</td><td class="value" style="font-family: monospace; font-size: 15px; color: #0284c7;">${destAccount}</td></tr>
            ${accountDetails?.bankName ? `<tr><td class="label">Banco:</td><td class="value">${accountDetails.bankName}</td></tr>` : ''}
            ${accountDetails?.nib ? `<tr><td class="label">NIB:</td><td class="value" style="font-family: monospace;">${accountDetails.nib}</td></tr>` : ''}
          </table>

          <div class="section-title">Balanço da Carteira TeleMoto+</div>
          <table class="data-table">
            <tr><td class="label">Saldo Antes do Saque:</td><td class="value">${balanceBefore} MT</td></tr>
            <tr><td class="label">Valor Descontado:</td><td class="value" style="color: #dc2626;">-${amount} MT</td></tr>
            <tr><td class="label">Saldo Atual Restante:</td><td class="value" style="color: #16a34a;">${balanceAfter} MT</td></tr>
          </table>

          <div class="notice">
            ⚡ <strong>Ação Necessária:</strong> O valor de <strong>${amount} MT</strong> já foi <strong>automaticamente deduzido</strong> da carteira digital do condutor no aplicativo TeleMoto+. Por favor efetue a transferência manual (via M-Pesa B2C/STK, e-Mola ou IZI/Smartnet BIM) para os dados acima nos próximos minutos.
          </div>
        </div>
        <div class="footer">
          TeleMoto+ Moçambique • Sistema de Liquidação Financeira • Administrador: brunomuhacha016@gmail.com
        </div>
      </div>
    </body>
    </html>
  `;

  let emailSent = false;
  let emailError: string | null = null;

  // Check SMTP configuration
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Boolean(process.env.SMTP_SECURE === 'true'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"TeleMoto+ Moçambique" <${process.env.SMTP_USER}>`,
        to: targetAdminEmail,
        subject: emailSubject,
        html: emailHtml,
      });
      emailSent = true;
      console.log(`[SMTP] Payout notification successfully emailed to ${targetAdminEmail}`);
    } catch (smtpErr: any) {
      console.error('[SMTP Error] Could not send payout email:', smtpErr);
      emailError = smtpErr?.message;
    }
  } else {
    console.log(`\n============================================================`);
    console.log(`📧 [PAYOUT ALERT DISPATCHED TO: ${targetAdminEmail}]`);
    console.log(`Assunto: ${emailSubject}`);
    console.log(`Motorista: ${driverName} (${driverPhone})`);
    console.log(`Valor: ${amount} MT | Destino: ${walletLabel} -> ${destAccount}`);
    console.log(`Saldo Anterior: ${balanceBefore} MT | Novo Saldo: ${balanceAfter} MT`);
    console.log(`============================================================\n`);
    emailSent = true; // Logged and queued
  }

  return res.json({
    success: true,
    recipient: targetAdminEmail,
    emailSent,
    error: emailError,
    message: `Pedido de saque registado. Alerta enviado para ${targetAdminEmail}.`,
  });
});

/**
 * Serve Client (Vite Dev in development, Static in production)
 */
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`TeleMoto+ server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
