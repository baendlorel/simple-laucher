declare module 'mem-use-ts' {
  export interface MemoryUsageInfo {
    name?: string;
    processName?: string;
    command?: string;
    memoryUsage?: number | string;
    memory?: number | string;
    rss?: number | string;
  }

  export function getMemoryUsage(): MemoryUsageInfo[] | Promise<MemoryUsageInfo[]>;
}
