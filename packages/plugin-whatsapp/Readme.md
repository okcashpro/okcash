# WhatsApp Cloud API Plugin

A plugin for integrating WhatsApp Cloud API with your application.

## Installation

</file>

npm install @eliza/plugin-whatsapp

## Configuration

typescript
import { WhatsAppPlugin } from '@eliza/plugin-whatsapp';
const whatsappPlugin = new WhatsAppPlugin({
accessToken: 'your_access_token',
phoneNumberId: 'your_phone_number_id',
webhookVerifyToken: 'your_webhook_verify_token',
businessAccountId: 'your_business_account_id'
});

## Usage

### Sending Messages

typescript
// Send a text message
await whatsappPlugin.sendMessage({
type: 'text',
to: '1234567890',
content: 'Hello from WhatsApp!'
});
// Send a template message
await whatsappPlugin.sendMessage({
type: 'template',
to: '1234567890',
content: {
name: 'hello_world',
language: {
code: 'en'
}
}
});

### Handling Webhooks

typescript
// Verify webhook
app.get('/webhook', (req, res) => {
const verified = await whatsappPlugin.verifyWebhook(req.query['hub.verify_token']);
if (verified) {
res.send(req.query['hub.challenge']);
} else {
res.sendStatus(403);
}
});
// Handle webhook events
app.post('/webhook', (req, res) => {
await whatsappPlugin.handleWebhook(req.body);
res.sendStatus(200);
});

## Features

-   Send text messages
-   Send template messages
-   Webhook verification
-   Webhook event handling
-   Message status updates

## API Reference

### WhatsAppPlugin

#### Constructor

-   `config: WhatsAppConfig` - Configuration object for the plugin

#### Methods

-   `sendMessage(message: WhatsAppMessage): Promise<any>` - Send a WhatsApp message
-   `handleWebhook(event: WhatsAppWebhookEvent): Promise<void>` - Process incoming webhook events
-   `verifyWebhook(token: string): Promise<boolean>` - Verify webhook token

### Types

typescript
interface WhatsAppConfig {
accessToken: string;
phoneNumberId: string;
webhookVerifyToken?: string;
businessAccountId?: string;
}
interface WhatsAppMessage {
type: 'text' | 'template';
to: string;
content: string | WhatsAppTemplate;
}
interface WhatsAppTemplate {
name: string;
language: {
code: string;
};
components?: Array<{
type: string;
parameters: Array<{
type: string;
text?: string;
}>;
}>;
}

## Error Handling

The plugin throws errors in the following cases:

-   Invalid configuration
-   Failed message sending
-   Webhook verification failure
-   Invalid webhook payload

Example error handling:

typescript
try {
await whatsappPlugin.sendMessage({
type: 'text',
to: '1234567890',
content: 'Hello!'
});
} catch (error) {
console.error('Failed to send message:', error.message);
}

## Best Practices

1. Always validate phone numbers before sending messages
2. Use template messages for first-time messages to users
3. Store message IDs for tracking delivery status
4. Implement proper error handling
5. Set up webhook retry mechanisms
6. Keep your access tokens secure

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
