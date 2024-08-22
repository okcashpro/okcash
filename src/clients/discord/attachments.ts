import {
  Attachment,
  Collection
} from "discord.js";
import { BrowserService } from "../../services/browser.ts";
import ImageRecognitionService from "../../services/imageRecognition.ts";
import { YouTubeService } from "../../services/youtube.ts";
import { Media } from "../../types.ts";


export class AttachmentManager {
    private imageRecognitionService: ImageRecognitionService;
    private browserService: BrowserService;
    private youtubeService: YouTubeService;
    private attachmentCache: Map<string, Media> = new Map();
  
    constructor(imageRecognitionService: ImageRecognitionService, browserService: BrowserService, youtubeService: YouTubeService) {
      this.imageRecognitionService = imageRecognitionService;
      this.browserService = browserService;
      this.youtubeService = youtubeService;
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
      if (attachment.contentType?.startsWith('image/')) {
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