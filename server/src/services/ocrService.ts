import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface OCRResult {
  success: boolean;
  data?: any;
  text?: string;
  error?: string;
  confidence?: number;
  processingTime?: number;
  template?: {
    id: string;
    name: string;
    module: string;
  } | null;
}

export interface TextBlock {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export class OCRService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;
  private initializationAttempts = 0;
  private maxAttempts = 3;
  private ocrEngine: 'tesseract-js' | 'node-tesseract' = 'node-tesseract';

  // Initialize OCR service
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing OCR service (using native Tesseract)...');
      
      // Directly use underlying Tesseract, skip Tesseract.js
      await this.initializeNodeTesseract();
      this.ocrEngine = 'node-tesseract';
      this.isInitialized = true;
      this.initializationAttempts = 0;
      console.log('✅ Native OCR service initialization completed');
    } catch (error) {
      console.error('❌ Native OCR service initialization failed:', error);
      this.initializationAttempts++;
      
      if (this.initializationAttempts < this.maxAttempts) {
        console.log(`🔄 Retrying initialization (${this.initializationAttempts}/${this.maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.initialize();
      }
      
      throw new Error('OCR service initialization failed, please check Tesseract installation');
    }
  }

  // Initialize Tesseract.js
  private async initializeTesseractJS(): Promise<void> {
    console.log('🔄 Initializing Tesseract.js...');
    
    // Create cache directory
    const cacheDir = path.join(process.cwd(), 'tesseract-cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    this.worker = await Tesseract.createWorker({
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
      cachePath: cacheDir,
      workerPath: 'https://unpkg.com/tesseract.js@v4.1.1/dist/worker.min.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      corePath: 'https://unpkg.com/tesseract.js-core@v4.0.4/tesseract-core.wasm.js'
    });
    
    await this.worker.loadLanguage('eng');
    await this.worker.initialize('eng');
    
    // Set recognition parameters
    await this.worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      preserve_interword_spaces: '1',
    });
  }

  // Initialize node-tesseract-ocr
  private async initializeNodeTesseract(): Promise<void> {
    console.log('🔄 Initializing node-tesseract-ocr...');
    
    // Check if Tesseract is installed on the system
    return new Promise((resolve, reject) => {
      const tesseract = spawn('tesseract', ['--version']);
      
      tesseract.on('close', (code) => {
        if (code === 0) {
          console.log('✅ System Tesseract available');
          resolve();
        } else {
          reject(new Error('System Tesseract not installed, please install Tesseract OCR first'));
        }
      });
      
      tesseract.on('error', (error) => {
        reject(new Error('Cannot find Tesseract command, please install Tesseract OCR first'));
      });
    });
  }

  // Preprocess image
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Use sharp for image preprocessing
      const processedBuffer = await sharp(imageBuffer)
        .resize(1920, null, { withoutEnlargement: true }) // Resize while maintaining aspect ratio
        .sharpen() // Sharpen
        .normalize() // Normalize contrast
        .threshold(128) // Binarize
        .png()
        .toBuffer();

      return processedBuffer;
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      return imageBuffer; // If preprocessing fails, return original image
    }
  }

  // Recognize text in image
  async recognizeText(imageBuffer: Buffer, template?: any): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Ensure OCR is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Preprocess image
      const processedImage = await this.preprocessImage(imageBuffer);

      let result: any;
      
      // Use native Tesseract recognition
      result = await this.recognizeWithNodeTesseract(processedImage);
      
      const processingTime = Date.now() - startTime;

      // Parse recognition results
      const parsedData = this.parseOCRResult(result);
      
      // If template exists, use template to transform data
      let finalData = parsedData;
      if (template && template.template) {
        finalData = this.applyTemplate(result.text, template);
      }

      return {
        success: true,
        data: finalData || parsedData,
        text: result.text,
        confidence: result.confidence || 0.85,
        processingTime,
        template: template ? {
          id: template.id,
          name: template.name,
          module: template.module
        } : null
      };

    } catch (error) {
      console.error('OCR recognition failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR recognition failed',
        processingTime: Date.now() - startTime
      };
    }
  }

  // Recognize using Tesseract.js
  private async recognizeWithTesseractJS(imageBuffer: Buffer): Promise<any> {
    if (!this.worker) {
      throw new Error('Tesseract.js worker not initialized');
    }
    
    const result = await this.worker.recognize(imageBuffer);
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      lines: result.data.lines
    };
  }

  // Recognize using node-tesseract-ocr
  private async recognizeWithNodeTesseract(imageBuffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      // Use system temporary directory
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `temp_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`);
      fs.writeFileSync(tempFile, imageBuffer);
      
      const tesseract = spawn('tesseract', [
        tempFile,
        'stdout',
        '-l', 'eng',
        '--psm', '6',
        '--oem', '3'
      ]);
      
      let output = '';
      let error = '';
      
      tesseract.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      tesseract.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      tesseract.on('close', (code) => {
        // Clean up temporary files
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
        
        if (code === 0) {
          resolve({
            text: output.trim(),
            confidence: 0.85,
            lines: output.trim().split('\n').map((line: string, index: number) => ({
              text: line,
              confidence: 0.85,
              bbox: {
                x0: 10,
                y0: index * 30 + 10,
                x1: 10 + line.length * 8,
                y1: index * 30 + 30
              }
            }))
          });
        } else {
          reject(new Error(`Tesseract recognition failed: ${error}`));
        }
      });
      
      tesseract.on('error', (err) => {
        reject(new Error(`Tesseract execution error: ${err.message}`));
      });
    });
  }

  // Parse OCR results and extract structured data
  private parseOCRResult(result: any): any {
    const text = result.text || '';
    const lines = result.lines || [];
    
    // Try to recognize different data structures
    const parsedData = {
      rawText: text,
      lines: lines.map((line: any) => ({
        text: line.text || '',
        confidence: line.confidence || 0,
        bbox: line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 }
      })),
      extractedData: this.extractStructuredData(text, lines)
    };

    return parsedData;
  }

  // Extract structured data
  private extractStructuredData(text: string, lines: any[]): any {
    const data: any = {
      names: [],
      numbers: [],
      dates: [],
      roles: [],
      levels: [],
      contributions: [],
      genders: [],
      classes: [],
      positions: [],
      sevenDayContributions: [],
      totalContributions: [],
      onlineTimes: []
    };

    // Extract names - based on line parsing rather than simple regex matching
    data.names = this.extractPlayerNames(text, lines);

    // Extract numbers (levels, contributions, positions, etc.)
    const numberPattern = /\d+/g;
    const numbers = text.match(numberPattern) || [];
    data.numbers = numbers.map((n: string) => parseInt(n));

    // Extract dates
    const datePattern = /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g;
    const dates = text.match(datePattern) || [];
    data.dates = dates;

    // Extract genders
    const genderPattern = /(Male|Female|M|F)/gi;
    const genders = text.match(genderPattern) || [];
    data.genders = [...new Set(genders)];

    // Extract jobs/job classes
    const classPattern = /(Whitesmith|Blacksmith|Knight|Priest|Wizard|Archer|Assassin|Merchant|Alchemist|Sage|Monk|Paladin|Hunter|Bard|Dancer|Rogue|Ninja|Gunslinger|Taekwon|Star|Gladiator|Soul|Linker|Ranger|Mechanic|Genetic|Creator|Champion|Professor|High|Arch|Lord|Emperor|Sura|Warlock|Rune|Wanderer|Minstrel|Gypsy|Shadow|Chaser|Rebellion|Guillotine|Magic|Royal|Guard|Ranger|Mechanic|Genetic|Creator|Champion|Professor|High|Arch|Lord|Emperor|Sura|Warlock|Rune|Wanderer|Minstrel|Gypsy|Shadow|Chaser|Rebellion|Guillotine|Magic|Royal|Guard)/gi;
    const classes = text.match(classPattern) || [];
    data.classes = [...new Set(classes)];

    // Extract roles
    const rolePattern = /(leader|officer|member)/gi;
    const roles = text.match(rolePattern) || [];
    data.roles = [...new Set(roles)];

    // Extract levels (Lv.number or Level number or pure number)
    const levelPattern = /(?:Lv\.|Level)\s*(\d+)/gi;
    const levels = [];
    let levelMatch;
    while ((levelMatch = levelPattern.exec(text)) !== null) {
      if (levelMatch[1]) {
        levels.push(parseInt(levelMatch[1]));
      }
    }
    data.levels = levels;

    // Extract contributions (7-day and total contributions)
    const contributionPattern = /(?:Contribution|Contrib)\s*(\d+)/gi;
    const contributions = [];
    let contributionMatch;
    while ((contributionMatch = contributionPattern.exec(text)) !== null) {
      if (contributionMatch[1]) {
        contributions.push(parseInt(contributionMatch[1]));
      }
    }
    data.contributions = contributions;

    // Extract online status
    const onlinePattern = /(Online|Offline)/gi;
    const onlineTimes = text.match(onlinePattern) || [];
    data.onlineTimes = [...new Set(onlineTimes)];

    // Try to recognize table structure
    const tableData = this.extractTableData(lines);
    if (tableData.length > 0) {
      data.tableData = tableData;
    }

    return data;
  }

  // Extract table data
  private extractTableData(lines: any[]): any[] {
    const tableData = [];
    
    // Group by y-coordinate to identify table rows
    const lineGroups = this.groupLinesByYPosition(lines);
    
    for (const group of lineGroups) {
      if (group.length > 1) {
        // Sort by x-coordinate to identify table columns
        const sortedGroup = group.sort((a: any, b: any) => a.bbox.x0 - b.bbox.x0);
        const rowData = sortedGroup.map((line: any) => ({
          text: (line.text || '').trim(),
          confidence: line.confidence || 0,
          x: line.bbox?.x0 || 0
        }));
        
        if (rowData.length > 0) {
          tableData.push(rowData);
        }
      }
    }

    return tableData;
  }

  // Group lines by Y coordinate
  private groupLinesByYPosition(lines: any[]): any[][] {
    const groups: any[][] = [];
    const tolerance = 10; // Tolerance range

    for (const line of lines) {
      let addedToGroup = false;
      
      for (const group of groups) {
        if (group.length > 0) {
          const firstLine = group[0];
          const yDiff = Math.abs((line.bbox?.y0 || 0) - (firstLine.bbox?.y0 || 0));
          
          if (yDiff <= tolerance) {
            group.push(line);
            addedToGroup = true;
            break;
          }
        }
      }
      
      if (!addedToGroup) {
        groups.push([line]);
      }
    }

    return groups;
  }

  // Extract player names - improved method to handle names with spaces
  private extractPlayerNames(text: string, lines: any[]): string[] {
    const names: string[] = [];
    
    // First try to extract complete player names from line data
    for (const line of lines) {
      const lineText = line.text || '';
      if (lineText.trim()) {
        const playerName = this.extractPlayerNameFromLine(lineText);
        if (playerName) {
          names.push(playerName);
        }
      }
    }
    
    // If line data is not available, fall back to text parsing
    if (names.length === 0) {
      const textLines = text.split('\n');
      for (const textLine of textLines) {
        const playerName = this.extractPlayerNameFromLine(textLine);
        if (playerName) {
          names.push(playerName);
        }
      }
    }
    
    // Deduplicate and filter
    return [...new Set(names)].filter(name => name.length >= 2);
  }

  // Extract player name from single line text
  private extractPlayerNameFromLine(lineText: string): string | null {
    const trimmed = lineText.trim();
    if (!trimmed) return null;
    
    // Common ROX game job names
    const classNames = [
      'Whitesmith', 'High Priest', 'Lord Knight', 'Paladin', 'Assassin Cross',
      'High Wizard', 'Champion', 'Sniper', 'Clown', 'Gypsy', 'Stalker',
      'Creator', 'Professor', 'Priest', 'Knight', 'Wizard', 'Archer',
      'Assassin', 'Merchant', 'Monk', 'Hunter', 'Blacksmith', 'Sage',
      'Rogue', 'Alchemist', 'Bard', 'Dancer'
    ];
    
    // Status keywords
    const statusKeywords = ['Online', 'Offline', 'ago', 'minute', 'hour', 'day'];
    
    // Character level keywords  
    const roleKeywords = ['Guild Leader', 'Deputy Leader', 'Tier 1 Member', 'Member'];
    
    // Try to identify player name patterns:
    // 1. Names are usually at the beginning of the line
    // 2. Followed by numbers (level)
    // 3. Then followed by job names
    
    // Split text to find possible player names
    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) return null; // At least need name level job
    
    // Find the position of the first job name
    let classIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part && classNames.some(className => 
        part.toLowerCase().includes(className.toLowerCase()) ||
        className.toLowerCase().includes(part.toLowerCase())
      )) {
        classIndex = i;
        break;
      }
    }
    
    if (classIndex === -1) return null;
    
    // Extract player name from start to job name
    // Skip the last number (level)
    let nameEndIndex = classIndex - 1;
    
    // Search backwards, skip numbers (level)
    while (nameEndIndex > 0) {
      const part = parts[nameEndIndex];
      if (part && /^\d+$/.test(part)) {
        nameEndIndex--;
      } else {
        break;
      }
    }
    
    if (nameEndIndex < 0) return null;
    
    // Extract player name (may contain multiple words)
    const nameParts = parts.slice(0, nameEndIndex + 1);
    
    // Filter out parts that are obviously not names
    const filteredNameParts = nameParts.filter(part => {
      if (!part) return false;
      // Skip pure numbers
      if (/^\d+$/.test(part)) return false;
      // Skip parts starting with special symbols
      if (/^[+\-=*#:;,.\[\]{}()]+/.test(part)) return false;
      // Skip status keywords
      if (statusKeywords.some(keyword => 
        part.toLowerCase().includes(keyword.toLowerCase())
      )) return false;
      return true;
    });
    
    if (filteredNameParts.length === 0) return null;
    
    const playerName = filteredNameParts.join(' ').trim();
    
    // Validate extracted name
    if (playerName.length >= 2 && playerName.length <= 50) {
      return playerName;
    }
    
    return null;
  }

  // Get recognition statistics
  async getStatistics(): Promise<any> {
    return {
      isInitialized: this.isInitialized,
      workerStatus: this.worker ? 'active' : 'inactive',
      supportedLanguages: ['eng'],
      initializationAttempts: this.initializationAttempts,
      ocrEngine: this.ocrEngine
    };
  }

  // Clean up resources
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    console.log('🧹 OCR service cleaned up');
  }

  // Public method: apply template processing to text
  async applyTemplateToText(rawText: string, template: any): Promise<any> {
    return this.applyTemplate(rawText, template);
  }

  // Apply template to transform data
  private applyTemplate(rawText: string, template: any): any {
    try {
      const templateConfig = template.template;
      const fieldMapping = templateConfig.fieldMapping;
      const parseRules = templateConfig.parseRules;
      const outputFormat = templateConfig.outputFormat;

      console.log(`Applying template: ${template.name} (${template.module})`);

      // Split raw text by lines
      const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Process data according to module type
      switch (template.module) {
        case 'guild':
          return this.processGuildTemplate(lines, templateConfig);
        case 'kvm':
          return this.processKVMTemplate(lines, templateConfig);
        case 'gvg':
          return this.processGVGTemplate(lines, templateConfig);
        case 'aa':
          return this.processAATemplate(lines, templateConfig);
        default:
          return this.processGenericTemplate(lines, templateConfig);
      }
    } catch (error) {
      console.error('Template application failed:', error);
      return null;
    }
  }

  // Process guild member template - enhanced recognition mode
  private processGuildTemplate(lines: string[], templateConfig: any): any {
    const members: any[] = [];
    let memberIndex = 1;

    console.log(`Starting to process guild member template, ${lines.length} lines of data:`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || typeof line !== 'string') {
        continue;
      }

      console.log(`Processing line ${i+1}: "${line}"`);

      // Skip header lines and invalid lines
      if (this.shouldSkipLine(line, templateConfig.parseRules)) {
        console.log(`Skipping line ${i+1}: "${line}"`);
        continue;
      }

      // Parse guild member line
      const member = this.parseGuildMemberLineWithTemplate(line, memberIndex, templateConfig);
      if (member) {
        members.push(member);
        console.log(`Extracted member: ${JSON.stringify(member)}`);
        memberIndex++;
      } else {
        console.log(`Failed to extract member info from line: "${line}"`);
      }
    }

    console.log(`Guild member template processing completed, extracted ${members.length} members`);

    // Return data format that meets user requirements
    return {
      members: members
    };
  }

  // Process KVM template
  private processKVMTemplate(lines: string[], templateConfig: any): any {
    const kvmData = {
      date: new Date().toISOString().split('T')[0],
      event_type: 'KVM',
      non_participants: [] as any[]
    };

    const nonParticipants: any[] = [];

    console.log(`Starting to process KVM template, ${lines.length} lines of data:`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || typeof line !== 'string') {
        continue; // Skip empty lines or non-string lines
      }
      
      console.log(`Processing line ${i+1}: "${line}"`);
      
      if (this.shouldSkipLine(line, templateConfig.parseRules)) {
        console.log(`Skipping line ${i+1}: "${line}"`);
        continue;
      }

      // Extract member name
      const memberName = this.extractGVGMemberName(line);
      if (memberName) {
        nonParticipants.push({ name: memberName });
        console.log(`Extracted member name: "${memberName}"`);
      } else {
        console.log(`Failed to extract member name from line: "${line}"`);
      }
    }

    kvmData.non_participants = nonParticipants;
    console.log(`KVM template processing completed, extracted ${nonParticipants.length} non-participating members:`, nonParticipants);

    return kvmData;
  }

  // Process GVG template
  private processGVGTemplate(lines: string[], templateConfig: any): any {
    const gvgData = {
      date: new Date().toISOString().split('T')[0],
      event_type: 'GVG',
      non_participants: [] as any[]
    };

    const nonParticipants: any[] = [];

    console.log(`Starting to process GVG template, ${lines.length} lines of data:`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || typeof line !== 'string') {
        continue; // Skip empty lines or non-string lines
      }
      
      console.log(`Processing line ${i+1}: "${line}"`);
      
      if (this.shouldSkipLine(line, templateConfig.parseRules)) {
        console.log(`Skipping line ${i+1}: "${line}"`);
        continue;
      }

      // Extract member name - optimized name extraction
      const memberName = this.extractGVGMemberName(line);
      if (memberName) {
        nonParticipants.push({ name: memberName });
        console.log(`Extracted member name: "${memberName}"`);
      } else {
        console.log(`Failed to extract member name from line: "${line}"`);
      }
    }

    gvgData.non_participants = nonParticipants;
    console.log(`GVG template processing completed, extracted ${nonParticipants.length} non-participating members:`, nonParticipants);

    return gvgData;
  }

  // Process AA template
  private processAATemplate(lines: string[], templateConfig: any): any {
    const aaData = {
      date: new Date().toISOString().split('T')[0],
      event_type: 'AA',
      participants: [] as any[]
    };

    const participants: any[] = [];

    for (const line of lines) {
      if (!line || typeof line !== 'string') {
        continue; // Skip empty lines or non-string lines
      }
      
      if (this.shouldSkipLine(line, templateConfig.parseRules)) {
        continue;
      }

      // Only parse participant names
      const participantName = this.extractAAParticipantName(line);
      if (participantName) {
        participants.push({
          name: participantName
        });
      }
    }

    aaData.participants = participants;
    console.log(`AA template processing completed, extracted ${participants.length} participating members`);

    return aaData;
  }

  // Process generic template
  private processGenericTemplate(lines: string[], templateConfig: any): any {
    const result: any = {};
    
    for (const line of lines) {
      if (this.shouldSkipLine(line, templateConfig.parseRules)) {
        continue;
      }
      
      // Extract data according to field mapping
      for (const [fieldKey, fieldConfig] of Object.entries(templateConfig.fieldMapping)) {
        const value = this.extractFieldValue(line, fieldConfig as any);
        if (value !== null) {
          result[fieldKey] = value;
        }
      }
    }

    return result;
  }

  // Check if a line should be skipped
  private shouldSkipLine(line: string, parseRules: any[]): boolean {
    for (const rule of parseRules) {
      if (rule.type === 'line_pattern' && rule.config.skipConditions) {
        for (const condition of rule.config.skipConditions) {
          if (line.includes(condition)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Parse guild member line using template - enhanced recognition mode
  private parseGuildMemberLineWithTemplate(line: string, index: number, templateConfig: any): any | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return null;
    
    // Skip obvious header lines and invalid lines
    if (this.isHeaderOrInvalidLine(trimmed)) {
      return null;
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) return null;

    // Enhanced recognition mode - more precise data extraction
    const memberData = this.parseGuildMemberDataEnhanced(parts, index);
    
    if (!memberData.name || memberData.name.length < 2) {
      return null;
    }

    return memberData;
  }

  // Check if line is header or invalid line
  private isHeaderOrInvalidLine(line: string): boolean {
    const headerKeywords = [
      'Guild', 'Member', 'Name', 'Level', 'Class', 'Position', 
      'Contribution', 'Online', 'Status', 'Gender', 'Guild', 'Member',
      'Name', 'Level', 'Job', 'Position', 'Contribution', 'Online', 'Gender'
    ];
    
    // Check if contains multiple header keywords
    const keywordCount = headerKeywords.filter(keyword => 
      line.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    return keywordCount >= 2;
  }

  // Enhanced guild member data parsing - parse in fixed order: name, gender, level, class, position, 7-day contribution, total contribution, online status
  private parseGuildMemberDataEnhanced(parts: string[], index: number): any {
    const result: any = {
      id: index,
      index: index,
      name: '',
      level: 1
    };

    // ROX job list
    const classNames = [
      'Whitesmith', 'High Priest', 'Lord Knight', 'Paladin', 'Assassin Cross',
      'High Wizard', 'Champion', 'Sniper', 'Clown', 'Gypsy', 'Stalker',
      'Creator', 'Professor', 'Priest', 'Knight', 'Wizard', 'Archer',
      'Assassin', 'Merchant', 'Monk', 'Hunter', 'Blacksmith', 'Sage',
      'Rogue', 'Alchemist', 'Bard', 'Dancer', 'Ninja', 'Gunslinger',
      'Taekwon', 'Star Gladiator', 'Soul Linker', 'Super Novice',
      'Swordsman', 'Mage', 'Archer', 'Acolyte', 'Merchant', 'Thief',
      'Knight', 'Priest', 'Hunter', 'Crusader', 'Monk', 'Sage',
      'Blacksmith', 'Alchemist', 'Dancer', 'Bard', 'Rogue', 'Assassin'
    ];

    // Position keywords
    const positions = ['Guild Master', 'Vice Master', 'Officer', 'Member', 'Guild Leader', 'Deputy Leader', 'Officer', 'Member'];
    
    let currentIndex = 0;
    
    // 1. Parse name (first field)
    if (currentIndex < parts.length && parts[currentIndex]) {
      result.name = parts[currentIndex]!.trim();
      currentIndex++;
    }

    // 2. Parse gender (second field)
    if (currentIndex < parts.length && parts[currentIndex]) {
      const genderField = parts[currentIndex]!.trim();
      if (genderField === '♂' || genderField === 'M' || genderField.toLowerCase() === 'male') {
        result.gender = 'Male';
      } else if (genderField === '♀' || genderField === 'F' || genderField.toLowerCase() === 'female') {
        result.gender = 'Female';
      }
      currentIndex++;
    }

    // 3. Parse level (third field)
    if (currentIndex < parts.length && parts[currentIndex]) {
      const level = parseInt(parts[currentIndex]!);
      if (!isNaN(level) && level > 0 && level <= 999) {
        result.level = level;
      }
      currentIndex++;
    }

    // 4. Parse job (fourth field)
    if (currentIndex < parts.length && parts[currentIndex]) {
      const jobField = parts[currentIndex]!.trim();
      const matchedClass = classNames.find(className => 
        className.toLowerCase() === jobField.toLowerCase() || 
        jobField.toLowerCase().includes(className.toLowerCase())
      );
      if (matchedClass) {
        result.class = matchedClass;
      } else {
        result.class = jobField; // If no match found, use original value
      }
      currentIndex++;
    }

    // 5. Parse position (fifth field)
    if (currentIndex < parts.length && parts[currentIndex]) {
      const positionField = parts[currentIndex]!.trim();
      const matchedPosition = positions.find(pos => 
        pos.toLowerCase() === positionField.toLowerCase()
      );
      if (matchedPosition) {
        result.position = matchedPosition;
      } else {
        result.position = positionField; // If no match found, use original value
      }
      currentIndex++;
    }

    // 6. Parse 7-day contribution (sixth field)
    if (currentIndex < parts.length && parts[currentIndex]) {
      const sevenDay = parseInt(parts[currentIndex]!);
      if (!isNaN(sevenDay)) {
        result.sevenDayContribution = sevenDay;
      }
      currentIndex++;
    }

    // 7. Parse total contribution (seventh field)
    if (currentIndex < parts.length && parts[currentIndex]) {
      const total = parseInt(parts[currentIndex]!);
      if (!isNaN(total)) {
        result.totalContribution = total;
      }
      currentIndex++;
    }

    // 8. Parse online status (eighth field and after)
    if (currentIndex < parts.length) {
      const onlineField = parts.slice(currentIndex).join(' ').trim();
      if (onlineField) {
        result.onlineTime = onlineField;
      }
    }

    return result;
  }

  // Parse ranking line
  private parseRankingLine(line: string): any | null {
    const parts = line.split(/\s+/);
    if (parts.length < 4) return null;

    const rank = parseInt(parts[0] || '0');
    if (isNaN(rank)) return null;

    const points = parseInt(parts[parts.length - 1] || '0');
    if (isNaN(points)) return null;

    return {
      rank: rank,
      name: parts[1] || '',
      position: parts[2] || '',
      points: points
    };
  }

  // Extract member name
  private extractMemberName(line: string): string | null {
    const parts = line.split(/\s+/);
    if (parts.length > 0 && parts[0] && parts[0].match(/^[a-zA-Z][a-zA-Z0-9_]*$/)) {
      return parts[0];
    }
    return null;
  }

  // Extract number
  private extractNumber(text: string): number | null {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  // Extract value from field configuration
  private extractFieldValue(line: string, fieldConfig: any): any {
    // Extract values based on field type and configuration
    switch (fieldConfig.type) {
      case 'string':
        return line.trim();
      case 'number':
        const num = this.extractNumber(line);
        return num !== null ? num : (fieldConfig.defaultValue || 0);
      case 'date':
        const dateMatch = line.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
        return dateMatch ? dateMatch[0] : (fieldConfig.defaultValue || new Date().toISOString().split('T')[0]);
      case 'boolean':
        return line.toLowerCase().includes('true') || line.toLowerCase().includes('yes');
      default:
        return fieldConfig.defaultValue || null;
    }
  }

  // Extract member name specifically for GVG/KVM - simplified and optimized name recognition
  private extractGVGMemberName(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 2) return null;
    
    // Skip image separators
    if (trimmed.includes('---image separator---') || trimmed === '---image separator---') {
      return null;
    }
    
    // Skip obvious non-member name lines
    if (trimmed.includes('Guild') || trimmed.includes('Member') || trimmed.includes('©') || 
        trimmed.includes('Level') || /^\d+\s*$/.test(trimmed) ||
        trimmed.includes('Online') || trimmed.includes('Offline')) {
      return null;
    }
    
    // More precise OCR error filtering: only filter lines that are entirely interference characters
    if (/^[oO©]+$/.test(trimmed) || trimmed.length <= 3 && /^[oO©\s]+$/.test(trimmed)) {
      return null;
    }
    
    // Handle lines containing semicolons, extract the last name (e.g., "Nico.Robin；")
    if (trimmed.includes('；') || trimmed.includes(';')) {
      const parts = trimmed.split(/[；;]/);
      const lastPart = parts[parts.length - 2]?.trim(); // Part before semicolon
      if (lastPart && lastPart.length >= 2 && typeof lastPart === 'string') {
        return this.cleanPlayerName(lastPart);
      }
    }
    
    // Use entire trimmed line as name, only do basic cleaning
    const cleanedName = this.cleanPlayerName(trimmed);
    
    // Validate name validity
    if (cleanedName && 
        cleanedName.length >= 2 && 
        cleanedName.length <= 25 && 
        !/^(Online|Offline|Male|Female|\d+|Level|Guild|Member|Leader|Deputy)$/i.test(cleanedName)) {
      return cleanedName;
    }
    
    return null;
  }
  
  // Clean player name (version that preserves spaces)
  private cleanPlayerNameWithSpaces(name: string): string {
    // Remove special characters at beginning and end, but preserve spaces and common game name characters
    let cleaned = name.trim()
      .replace(/^[^\w\s]+/, '') // Remove non-alphanumeric space characters at beginning
      .replace(/[^\w\s.\-&+*#=]+$/, ''); // Remove special characters at end, but preserve common game name characters and spaces
    
    // Clean up excessive consecutive spaces, but preserve single spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  // Clean player name
  private cleanPlayerName(name: string): string {
    // Remove special characters at beginning and end, but preserve dots, underscores, etc. in the middle
    let cleaned = name.trim()
      .replace(/^[^\w]+/, '') // Remove non-alphanumeric characters at beginning
      .replace(/[^\w.\-&+*#=]+$/, ''); // Remove special characters at end, but preserve common game name characters
    
    // If name contains spaces, check if it's a compound name (e.g., "187 Soldiers", "Joy Boy", etc.)
    if (cleaned.includes(' ')) {
      const parts = cleaned.split(/\s+/);
      // If starts with number, might be format like "187 Soldiers"
      if (parts.length === 2 && parts[0] && /^\d+$/.test(parts[0])) {
        return cleaned; // Preserve complete name
      }
      // For other names containing spaces, also preserve complete name
      return cleaned;
    }
    
    return cleaned;
  }

  // Extract AA participant name (use OCR raw data directly, minimize filtering)
  private extractAAParticipantName(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 1) return null;
    
    // Only skip obvious image separators
    if (trimmed.includes('---image separator---') || trimmed === '---image separator---') {
      return null;
    }
    
    // Only perform most basic cleaning, preserve original names
    const cleanedName = this.basicCleanPlayerName(trimmed);
    
    // Return as long as it's not an empty string
    if (cleanedName && cleanedName.length >= 1) {
      return cleanedName;
    }
    
    return null;
  }

  // Basic name cleaning (minimal processing)
  private basicCleanPlayerName(name: string): string {
    // Only remove whitespace at beginning and end, preserve all other characters
    let cleaned = name.trim();
    
    // Only filter if entire line is just obvious OCR error symbols (very short and only contains special characters)
    if (cleaned.length <= 2 && /^[©\s]*$/.test(cleaned)) {
      return '';
    }
    
    return cleaned;
  }

  // Parse AA participant line (keep original method in case needed)
  private parseAAParticipantLine(line: string, rank: number): any | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) return null;
    
    // Try to match "rank name position points" format
    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) return null;
    
    // Extract numbers (possible rank and points)
    const numbers = parts.filter(p => /^\d+$/.test(p)).map(n => parseInt(n));
    
    // Find possible position keywords
    const positions = ['Leader', 'Deputy', 'Member', 'Tier', '187', 'Guild'];
    let position = '187'; // Default
    
    for (const part of parts) {
      if (positions.some(pos => part.includes(pos))) {
        if (part.includes('Leader')) position = 'Guild Leader';
        else if (part.includes('Deputy')) position = 'Deputy Leader';
        else if (part.includes('Tier')) position = 'Tier 1 Member';
        else position = part;
        break;
      }
    }
    
    // Try to extract name (usually the first non-numeric part)
    let name = '';
    for (const part of parts) {
      if (!/^\d+$/.test(part) && !positions.some(pos => part.includes(pos))) {
        name = part;
        break;
      }
    }
    
    if (!name) return null;
    
    return {
      rank: numbers.length > 0 ? numbers[0] : rank,
      name: name,
      position: position,
      points: numbers.length > 1 ? numbers[numbers.length - 1] : 0
    };
  }
}

export default new OCRService();