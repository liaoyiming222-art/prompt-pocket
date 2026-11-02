import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(process.env.PORTFOLIO_MODULES ? path.resolve(process.env.PORTFOLIO_MODULES,'package.json') : import.meta.url);
export const {chromium} = require('playwright');
export const sharp = require('sharp');
export const browserPath = process.env.BROWSER_PATH || (process.platform==='win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined);
