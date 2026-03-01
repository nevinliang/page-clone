export interface RecordedEndpoint {
  method: string;
  path: string;
  originalUrl: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  statusCode: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
  contentType: string;
}

export interface Recording {
  sourceUrl: string;
  sourceOrigin: string;
  snapshotPath: string;
  harPath: string;
  endpoints: RecordedEndpoint[];
  recordedAt: string;
  outputDir: string;
}

export interface PageCloneConfig {
  url: string;
  port: number;
  openaiApiKey?: string;
  recordOnly: boolean;
  outputDir?: string;
  waitTime: number;
}
