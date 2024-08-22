import {
  Attachment,
  Collection
} from "discord.js";
import { BrowserService } from "../../services/browser.ts";
import ImageRecognitionService from "../../services/imageRecognition.ts";
import { YouTubeService } from "../../services/youtube.ts";
import { Media } from "../../types.ts";
import { TranscriptionService } from "../../services/transcription.ts";
import { PdfService } from "../../services/pdf.ts";


export class AttachmentManager {
    private imageRecognitionService: ImageRecognitionService;
    private browserService: BrowserService;
    private youtubeService: YouTubeService;
    private attachmentCache: Map<string, Media> = new Map();
    private transcriptionService: TranscriptionService;
    private pdfService: PdfService
    
    constructor(imageRecognitionService: ImageRecognitionService, browserService: BrowserService, youtubeService: YouTubeService) {
      this.imageRecognitionService = imageRecognitionService;
      this.browserService = browserService;
      this.youtubeService = youtubeService;
      this.transcriptionService = new TranscriptionService();
      this.pdfService = new PdfService();
    }
  
    async processAttachments(attachments: Collection<string, Attachment> | Attachment[]): Promise<Media[]> {
      const processedAttachments: Media[] = [];
      const attachmentCollection = attachments instanceof Collection ? attachments : new Collection(attachments.map(att => [att.id, att]));
  
      for (const [, attachment] of attachmentCollection) {
        const media = await this.processAttachment(attachment);
        if (media) {
          processedAttachments.push(media);
        }
      }
  
      return processedAttachments;
    }
  
  
    async processAttachment(attachment: Attachment): Promise<Media | null> {
      if (this.attachmentCache.has(attachment.url)) {
        return this.attachmentCache.get(attachment.url)!;
      }
  
      let media: Media | null = null;
      if (attachment.contentType?.startsWith('application/pdf')) {
        media = await this.processPdfAttachment(attachment);
      } else if (attachment.contentType?.startsWith('text/plain')) {
        media = await this.processPlaintextAttachment(attachment);
      } else if (attachment.contentType?.startsWith('audio/')) {
        media = await this.processAudioAttachment(attachment);
      } else if (attachment.contentType?.startsWith('image/')) {
        media = await this.processImageAttachment(attachment);
      } else if (attachment.contentType?.startsWith('video/') || this.youtubeService.isVideoUrl(attachment.url)) {
        media = await this.processVideoAttachment(attachment);
      } else {
        media = await this.processGenericAttachment(attachment);
      }
  
      if (media) {
        this.attachmentCache.set(attachment.url, media);
      }
      return media;
    }

    private async processPdfAttachment(attachment: Attachment): Promise<Media> {
      try {
        const response = await fetch(attachment.url);
        const pdfBuffer = await response.arrayBuffer();
        const text = await this.pdfService.convertPdfToText(Buffer.from(pdfBuffer));
  
        return {
          id: attachment.id,
          url: attachment.url,
          title: 'PDF Attachment',
          source: 'PDF',
          description: 'A PDF document',
          text: text,
        };
      } catch (error) {
        console.error(`Error processing PDF attachment: ${error.message}`);
        return {
          id: attachment.id,
          url: attachment.url,
          title: 'PDF Attachment',
          source: 'PDF',
          description: 'A PDF document (conversion failed)',
          text: `This is a PDF attachment. File name: ${attachment.name}, Size: ${attachment.size} bytes`,
        };
      }
    }
  
    private async processPlaintextAttachment(attachment: Attachment): Promise<Media> {
      try {
        const response = await fetch(attachment.url);
        const text = await response.text();
  
        return {
          id: attachment.id,
          url: attachment.url,
          title: 'Plaintext Attachment',
          source: 'Plaintext',
          description: 'A plaintext document',
          text: text,
        };
      } catch (error) {
        console.error(`Error processing plaintext attachment: ${error.message}`);
        return {
          id: attachment.id,
          url: attachment.url,
          title: 'Plaintext Attachment',
          source: 'Plaintext',
          description: 'A plaintext document (retrieval failed)',
          text: `This is a plaintext attachment. File name: ${attachment.name}, Size: ${attachment.size} bytes`,
        };
      }
    }  

    private async processAudioAttachment(attachment: Attachment): Promise<Media> {
      try {
        const response = await fetch(attachment.url);
        const audioData = await response.arrayBuffer();
    
        const transcription = await this.transcriptionService.transcribe(Buffer.from(audioData));
    
        return {
          id: attachment.id,
          url: attachment.url,
          title: 'Audio Attachment',
          source: 'Audio',
          description: 'User-upoaded audio attachment which has been transcribed',
          text: transcription || 'Audio content not available',
        };
      } catch (error) {
        console.error(`Error processing audio attachment: ${error.message}`);
        return {
          id: attachment.id,
          url: attachment.url,
          title: 'Audio Attachment',
          source: 'Audio',
          description: 'An audio attachment (transcription failed)',
          text: `This is an audio attachment. File name: ${attachment.name}, Size: ${attachment.size} bytes, Content type: ${attachment.contentType}`,
        };
      }
    }
    
  
    private async processImageAttachment(attachment: Attachment): Promise<Media> {
      try {
        const recognitionResult = await this.imageRecognitionService.recognizeImage(attachment.url);
        return {
          id: attachment.id,
          url: attachment.url,
          title: 'Image Attachment',
          source: 'Image',
          description: recognitionResult || 'An image attachment',
          text: recognitionResult || 'Image content not available',
        };
      } catch (error) {
        console.error(`Error processing image attachment: ${error.message}`);
        return this.createFallbackImageMedia(attachment);
      }
    }
  
    private createFallbackImageMedia(attachment: Attachment): Media {
      return {
        id: attachment.id,
        url: attachment.url,
        title: 'Image Attachment',
        source: 'Image',
        description: 'An image attachment (recognition failed)',
        text: `This is an image attachment. File name: ${attachment.name}, Size: ${attachment.size} bytes, Content type: ${attachment.contentType}`,
      };
    }
  
  
    private async processVideoAttachment(attachment: Attachment): Promise<Media> {
      if (this.youtubeService.isVideoUrl(attachment.url)) {
        const videoInfo = await this.youtubeService.processVideo(attachment.url);
        return {
          id: attachment.id,
          url: attachment.url,
          title: videoInfo.title,
          source: 'YouTube',
          description: videoInfo.description,
          text: videoInfo.text
        };
      } else {
        return {
          id: attachment.id,
          url: attachment.url,
          title: 'Video Attachment',
          source: 'Video',
          description: 'A video attachment',
          text: 'Video content not available',
        };
      }
    }
  
    private async processGenericAttachment(attachment: Attachment): Promise<Media> {
      return {
        id: attachment.id,
        url: attachment.url,
        title: 'Generic Attachment',
        source: 'Generic',
        description: 'A generic attachment',
        text: 'Attachment content not available',
      };
    }
  }