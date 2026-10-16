declare module "expo-document-picker" {
  export interface DocumentPickerAsset {
    name?: string;
    size?: number;
    uri: string;
    mimeType?: string;
    file?: File | Blob;
    lastModified?: number;
  }

  export interface DocumentPickerOptions {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }

  export interface DocumentPickerSuccessResult {
    canceled: false;
    assets: DocumentPickerAsset[];
  }

  export interface DocumentPickerCanceledResult {
    canceled: true;
    assets: null;
  }

  export type DocumentPickerResult =
    | DocumentPickerSuccessResult
    | DocumentPickerCanceledResult;

  export function getDocumentAsync(
    options?: DocumentPickerOptions
  ): Promise<DocumentPickerResult>;
}
