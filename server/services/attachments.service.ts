import { IStorage } from '../storage';

export class AttachmentsService {
  constructor(private storage: IStorage) {}

  async formatAudioFileName(userId: number, originalFileName: string, attachmentType: string): Promise<string> {
    let displayFileName = originalFileName;

    if (attachmentType === 'audio') {
      const user = await this.storage.getUser(userId);

      if (user && originalFileName.includes('personel_')) {
        displayFileName = `Voice Note - ${user.callsign || 'Personel'} - ${user.nrp || ''}`;
        console.log(`File audio dari ${user.callsign} (${user.nrp}) diupload:`, displayFileName);
      }
    }

    return displayFileName;
  }
}
