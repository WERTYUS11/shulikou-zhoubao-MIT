import { Context, Schema } from 'koishi'
import * as https from 'https'
import * as http from 'http'

export const name = 'shulikou-zhoubao'

export interface Config {
  dataUrl: string
}

export const Config: Schema<Config> = Schema.object({
  dataUrl: Schema.string().description('JSON 数据的 URL（如果您不懂请不要动！）')
    .default('https://gist.githubusercontent.com/WERTYUS11/88aec2a43a2a3302eac53ecd5ed52d9b/raw/data.json') // 默认 URL
})

export function apply(ctx: Context, config: Config) {
  let cachedData: any = null;
  let lastRefreshTime: Date | null = null;

  // 初始加载数据
  refreshData();

  ctx.command('zhoubao', '显示周榜数据')
    .action(async ({ session }) => {
      try {
        if (!cachedData) {
          await refreshData(); // 如果没有缓存，则刷新
          if (!cachedData) {
            return '数据加载失败，请稍后重试或手动刷新。';
          }
        }

        let output = '';
        cachedData.forEach(item => {
          output += `${item.rank}${item.isNew ? '（NEW!）' : ''}\n`;
          output += `名称:${item.name}\n`;
          output += `作者:${item.author}\n`;
          output += `BV:${item.bv}\n`;
          output += `上周：${item.lastWeek}  在榜周数：${item.weeksOnChart}\n`;
          output += '-----------------------------------------\n';
        });

        if (lastRefreshTime) {
          output += `\n上次刷新时间：${lastRefreshTime.toLocaleString()}`;
        } else {
          output += '\n数据尚未刷新';
        }

        return output;
      } catch (error) {
        console.error('Error fetching JSON data:', error)
        return `获取 JSON 数据失败: ${error}`
      }
    })

  ctx.command('datarefresh', '刷新周榜数据')
    .action(async ({ session }) => {
      try {
        await refreshData();
        return '数据刷新成功！';
      } catch (error) {
        console.error('Error refreshing data:', error);
        return `数据刷新失败: ${error}`;
      }
    });

  // 刷新数据的函数
  async function refreshData() {
    try {
      cachedData = await getJsonData(config.dataUrl);
      lastRefreshTime = new Date();
    } catch (error) {
      console.error('Error refreshing JSON data:', error);
      throw error;
    }
  }

  // 从 URL 获取 JSON 数据的函数
  async function getJsonData(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        });

        res.on('error', (error) => {
          reject(error);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }
}
