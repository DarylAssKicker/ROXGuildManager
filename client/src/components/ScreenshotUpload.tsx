import React, { useState, useCallback } from 'react';
import { Upload, Button, message, Card, Tabs, Tag, Switch, Space, Typography, Row, Col } from 'antd';
import { UploadOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { analyzeScreenshot, getOCRStatus, reinitializeOCR } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import './ScreenshotUpload.css';

const { TabPane } = Tabs;
const { Text, Title } = Typography;

interface OCRResult {
  success: boolean;
  data?: any;
  text?: string;
  error?: string;
  confidence?: number;
  processingTime?: number;
}

interface GuildMember {
  index?: number;
  name: string;
  level?: number;
  class?: string;
  [key: string]: any;
}

const ScreenshotUpload: React.FC = () => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrStatus, setOcrStatus] = useState<any>(null);
  const [isGuildMemberMode, setIsGuildMemberMode] = useState(false);
  const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const { t } = useTranslation();

  // Handle file list changes
  const handleFileListChange = useCallback(({ fileList: newFileList }: { fileList: any[] }) => {
    console.log('File list changed, new length:', newFileList.length);
    
    // Force deduplication based on file uid
    const uniqueFiles = newFileList.reduce((acc: any[], file: any) => {
      const existingFile = acc.find((f: any) => f.uid === file.uid);
      if (!existingFile) {
        acc.push(file);
      }
      return acc;
    }, []);
    
    console.log('After deduplication, length:', uniqueFiles.length);
    setFileList(uniqueFiles);
  }, []);

  // Get OCR status
  const fetchOCRStatus = async () => {
    try {
      const status = await getOCRStatus();
      setOcrStatus(status);
    } catch (error) {
      console.error('Failed to get OCR status:', error);
    }
  };

  // Reinitialize OCR
  const handleReinitializeOCR = async () => {
    try {
      await reinitializeOCR();
      message.success(t('screenshot.reinitializeOcr') + ' ' + t('common.success'));
      await fetchOCRStatus();
    } catch (error) {
      message.error(t('screenshot.reinitializeOcr') + ' ' + t('common.error'));
    }
  };

  // Test parsing OCR data
  const testParseOCRData = () => {
    const testOCRData = {
      ocrResult: {
        rawText: `2] oO - * © +6 -6 +6 "
Roronoa.Zoro +? 67 Whitesmith 187 0 0 Online
Baygon 3 64 'Whitesmith 187 135 174 Online
xburden 63 'Whitesmith 187 136 1542 Shouris} ago
Artemisia, 469 Gypsy 187 no 1349 Online
POA Fa 68 Gypsy 187 138 1430 Online
Cte Fa 67 Gypsy 187 183 1387 Online
Nagiino 2 67 Gypsy 187 ° ° Online
Bubbles ey 66 Gypsy 187 2 1323 Online
yerimiese Fa 65 Gypsy 187 121 278 Online
Cazzo ES 69 Clown 187 146 1332 Online
Zunesha 3 68 'Clown 187 ° ° Online
KamenRaiderx:: 67 Clown 187 189 1377 Online
Peekaboo 66 Clown 187 132 394 Online
Xerxes 3 69 Sniper 187 134 1349 Online
187 Soldiers 68 Sniper Guild Leader 92 1743 days} ago
Yheee! 2 48 Sniper 187 227 877 Online
Raskun = 68 Sniper 187 163 1662 Online
a7RV = 68 Sniper 187 143 1004 Online
Ominousky ae 65 Sniper 187 138 131 Cnline
sJayFox* a 68 Sniper 187 134 649 Online
eryRAeL ee 67 Sniper 187 176 1783 Online
dOggame 2 67 Sniper 187 150 1324 Online
Reiga 5 67 Sniper 187 144 1641 Online
Tera 2 67 Sniper 187 134 1445 Online
Coffee 3 67 Sniper 187 132 ws Online
Mocha Pa 67 Sniper 187 Ns 1163 Online
Aling Dionisia :2 66 Sniper 187 168 a53 Online
Rizwoo = 66 Sniper 187 162 162 Online
Emz. : 66 Sniper 187 150 wiz Online
Crave a 66 Sniper 187 149 1604 Séminute(s| ago
TheChosenOna + 66 Sniper 187 105 an Online
Grail ES 65 Sniper 187 167 1664 Gnline
Emmet ES 65 Sniper 187 135 993 Online
=x—AaT EDs 65 Sniper 187 134 1941 Online
"yahoo 5 66 Stalker 187 156 1578 Online
DARFFYDARY 2 67 'Assassin Cross 187 72 1343 Online
wan: 3 66 Assassin Cross 187 131 1084 Online
Gxjvan » 45 Assassin Cross 187 134 ™ Online
ORCA = 67 High Wizard 187 0 0 Online
TIKAY Fa 66 High Wizard 187 162 79 Online
Pepperl4. 65 High Wizard 187 174 1073 Online
WELTALL * 65 High Wizard 187 173 1653 Online
Dark Wizard 5+ 65 High Wizard 187 72 825 Online
Amihan 2 65 High Wizard 187 159 180 Online
TIVIP ES 65 High Wizard 187 149 7ay 2hourt(s| ago
ElieBJoel =? 58 High Wizard 187 0 0 Online
Mark Eslava 66 'Champion 187 133 376 Online
one Fa 65 'Champion 187 133 1056 Online
Janghost —s 6s 'Champion 187 133 568 Online
Chopper 70 High Priest Deputy Leader 248 1823 Online
E_G#wrongHble 68 High Priest Tier 1 Member 123 Bn Online
Murphey FS 67 High Priest 187 159 159 Online
LordYam a 66 High Priest 187 131 1442 Cnline
wODWM " 66 High Priest 187 7 678 Online
Aetherielle a 65 High Priest 187 134 246 Online
CHILD BENDER 5: 65 High Priest 187 130 aly Online
HeyGuys 65 High Priest 187 2 1294 Online
Gothi 3 64 High Priest 187 145 N22 Online
Timex 3 64 High Priest 187 145 922 Online
Imanginee = 64 High Priest 187 18 297 Online
Bunny Fa 64 High Priest 187 109 745 Online
HERAAA 2 64 High Priest 187 0 0 Online
LEVI * 63 High Priest 187 166 1730 Online
"'Y qaverix a 63 High Priest 187 152 342 Online
Taliken ae 63 High Priest 187 oF 759 Shouris| ago
Come on Guys 3 66 Paladin Tier 1 Member 2 1528 Online
ean ES 66 Paladin 187 148 1768 Online
chet & 65 Paladin 187 138 327 Online
Devs 5 65 Paladin 187 128 790 Online
Ali 3 64 Paladin 187 2 736 Online
Joy Boy 3 "7 Lord Knight 187 0 0 Online
Joeléllie > 46 Lord Knight Tier 1 Member 0 0 Online
Oneleven 66 Lord Knight 187 201 94 Online
NOLDY = 66 Lord knight 187 166 1237 Online
'dom a 66 Lord Knight 187 160 383 Cnline
STRAMBERDI ;- 66 Lord Knight 187 148 326 44minute(s| ago
HaXXxx " 66 Lord Knight 187 135 135 Online
Invictus ES 65 Lord Knight 187 NS 850 Online
Cayde & 65 Lord Knight 187 83 1325 Online
Applefritter 2 60 Lord Knight 187 0 ° Online`
      }
    };
    
    const parsedMembers = processGuildMemberData(testOCRData);
    setGuildMembers(parsedMembers);
    message.success(`${t('screenshot.testParseCompleted')} ${parsedMembers.length} ${t('screenshot.membersRecognized')}`);
  };

  // Generate sample data for testing
  const generateSampleData = () => {
    const sampleMembers: GuildMember[] = [
      {
        index: 1,
        name: "Roronoa Zoro",
        level: 67,
        class: "Whitesmith"
      },
      {
        index: 2,
        name: "Monkey D Luffy",
        level: 85,
        class: "Lord Knight"
      },
      {
        index: 3,
        name: "Joy Boy",
        level: 72,
        class: "High Wizard"
      }
    ];
    setGuildMembers(sampleMembers);
    message.success(t('screenshot.sampleDataGenerated'));
  };

  // Process guild member data
  const processGuildMemberData = (ocrData: any): GuildMember[] => {
    const members: GuildMember[] = [];
    
    if (!ocrData) {
      return members;
    }

    // Handle different data structures
    let rawText = '';
    
    // Check if it's the new OCR result format
    if (ocrData.ocrResult && ocrData.ocrResult.rawText) {
      rawText = ocrData.ocrResult.rawText;
    } else if (ocrData.rawText) {
      rawText = ocrData.rawText;
    } else {
      return members;
    }
    
    // Use improved parsing method: parse line by line from raw text
    if (rawText) {
      const lines = rawText.split('\n');
      let memberIndex = 1;
      
      lines.forEach((line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0) {
          // Skip header lines and empty lines
          if (trimmedLine.includes('oO') || trimmedLine.includes('©') || trimmedLine.length < 10) {
            return;
          }
          
          // Improved parsing logic
          const member = parseGuildMemberLine(trimmedLine, memberIndex);
          if (member) {
            members.push(member);
            memberIndex++;
          }
        }
      });
    }

    return members;
  };

  // Parse single line guild member data
  // Standardize job class names function
  const standardizeJobClass = (jobClass: string): string => {
    const jobMapping: { [key: string]: string } = {
      'High Wizzard': 'High Wizard',
      'Wizzard': 'Wizard'
    };
    
    return jobMapping[jobClass] || jobClass;
  };

  const parseGuildMemberLine = (line: string, index: number): GuildMember | null => {
    const parts = line.split(/\s+/);
    if (parts.length < 3) return null; // At least need name, level, class
    
    // Common job class list (Chinese and English, including common spelling errors)
    const jobClasses = [
      'Whitesmith', 'High Priest', 'Lord Knight', 'Paladin', 'Assassin Cross',
      'High Wizard', 'High Wizzard', 'Champion', 'Sniper', 'Clown', 'Gypsy', 'Stalker',
      'Creator', 'Professor', 'Priest', 'Knight', 'Wizard', 'Wizzard', 'Archer',
      'Assassin', 'Merchant', 'Monk', 'Hunter', 'Blacksmith', 'Sage',
      'Rogue', 'Alchemist', 'Bard', 'Dancer', 'Ninja', 'Gunslinger',
      'Taekwon', 'Star Gladiator', 'Soul Linker', 'Super Novice',
      'Swordsman', 'Mage', 'Archer', 'Acolyte', 'Merchant', 'Thief',
      'Knight', 'Priest', 'Hunter', 'Crusader', 'Monk', 'Sage',
      'Blacksmith', 'Alchemist', 'Dancer', 'Bard', 'Rogue', 'Assassin'
    ];
    
    // Parse from back to front: find level (number) first, then job class, remaining is name
    let levelIndex = -1;
    let level = 0;
    
    // 1. Find level (find first pure number from back to front)
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(parts[i])) {
        levelIndex = i;
        level = parseInt(parts[i]);
        break;
      }
    }
    
    if (levelIndex === -1) return null; // No level found, invalid data
    
    // 2. Find job class (part after level)
    let foundJob = '';
    
    // Try to match three-word job class
    if (levelIndex + 3 < parts.length) {
      const threeWordJob = `${parts[levelIndex + 1]} ${parts[levelIndex + 2]} ${parts[levelIndex + 3]}`;
      const matchedThreeWord = jobClasses.find(job => job.toLowerCase() === threeWordJob.toLowerCase());
      if (matchedThreeWord) {
        foundJob = matchedThreeWord;
      }
    }
    
    // Try to match two-word job class
    if (!foundJob && levelIndex + 2 < parts.length) {
      const twoWordJob = `${parts[levelIndex + 1]} ${parts[levelIndex + 2]}`;
      const matchedTwoWord = jobClasses.find(job => job.toLowerCase() === twoWordJob.toLowerCase());
      if (matchedTwoWord) {
        foundJob = matchedTwoWord;
      }
    }
    
    // Try to match single-word job class
    if (!foundJob && levelIndex + 1 < parts.length) {
      const singleWordJob = parts[levelIndex + 1];
      const matchedSingleWord = jobClasses.find(job => job.toLowerCase() === singleWordJob.toLowerCase());
      if (matchedSingleWord) {
        foundJob = matchedSingleWord;
      }
    }
    
    if (!foundJob) return null; // No job class found, invalid data
    
    // 3. Parse name (all parts before level, remove last possible gender identifier)
    let playerName = '';
    if (levelIndex > 0) {
      const nameParts = parts.slice(0, levelIndex);
      // Remove last character as it might be gender identifier (like é, ♂, ♀, etc.)
      if (nameParts.length > 1) {
        nameParts.pop();
      }
      playerName = nameParts.join(' ').trim();
      if (!playerName) {
        return null; // No valid name, invalid data
      }
    } else {
      return null; // No name part, invalid data
    }
    
    return {
      index,
      name: playerName,
      level: level || 1,
      class: standardizeJobClass(foundJob)
    };
  };

  // Handle file upload
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error(t('screenshot.selectImage'));
      return;
    }

    setUploading(true);
    setOcrResult(null);
    setGuildMembers([]);

    try {
      const formData = new FormData();
      
      // Support multiple image upload - use unified field name
      fileList.forEach((file) => {
        formData.append('screenshots', file.originFileObj);
      });

      const result = await analyzeScreenshot(formData);
      setOcrResult(result);

      // If guild member mode is enabled, process data
      if (isGuildMemberMode && result.success && result.data) {
        const members = processGuildMemberData(result.data);
        setGuildMembers(members);
      }

      message.success(`${t('screenshot.recognitionSuccess')} (${fileList.length} images)`);
    } catch (error) {
      console.error('Upload failed:', error);
      message.error(t('screenshot.recognitionFailed'));
    } finally {
      setUploading(false);
    }
  };

  // Download JSON data
  const downloadJSON = (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render guild member data
  const renderGuildMembers = () => {
    if (guildMembers.length === 0) {
      return <Text type="secondary">{t('screenshot.noMemberData')}</Text>;
    }

    return (
      <div>
        <Space style={{ marginBottom: 16 }}>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => downloadJSON(guildMembers, 'guild_members.json')}
          >
            {t('screenshot.downloadJson')} (guild_members.json)
          </Button>
          <Button 
            type="default" 
            onClick={generateSampleData}
          >
            {t('screenshot.generateSampleData')}
          </Button>
          <Button 
            type="default" 
            onClick={testParseOCRData}
          >
            {t('screenshot.testParseOcrData')}
          </Button>
          <Text>{t('screenshot.membersRecognized')}: {guildMembers.length}</Text>
        </Space>
        
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {guildMembers.map((member, index) => (
            <Card 
              key={index} 
              size="small" 
              style={{ marginBottom: 8 }}
              title={
                <Space>
                  <Text strong>{member.name}</Text>
                  {member.index && <Tag color="default">#{member.index}</Tag>}
                  {member.level && <Tag color="blue">Lv.{member.level}</Tag>}
                  {member.gender && <Tag color="purple">{member.gender}</Tag>}
                  {member.class && <Tag color="green">{member.class}</Tag>}
                  {member.position && <Tag color="cyan">Pos.{member.position}</Tag>}
                </Space>
              }
            >
              <div>
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Text type="secondary">7-Day Contribution: </Text>
                    <Text strong>{member.sevenDayContribution || 0}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Total Contribution: </Text>
                    <Text strong>{member.totalContribution || 0}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Online Status: </Text>
                    <Tag color={member.onlineTime === 'Online' ? 'green' : 'red'}>
                      {member.onlineTime || 'Online'}
                    </Tag>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Class: </Text>
                    <Text>{member.class || 'Unknown'}</Text>
                  </Col>
                </Row>
                {/* Display other fields */}
                {Object.entries(member).map(([key, value]) => {
                  if (!['name', 'index', 'level', 'gender', 'class', 'position', 'sevenDayContribution', 'totalContribution', 'onlineTime'].includes(key) && value) {
                    return (
                      <div key={key} style={{ marginTop: 4 }}>
                        <Text type="secondary">{key}: </Text>
                        <Text>{value}</Text>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="screenshot-upload">
      <Card title={t('screenshot.title')} extra={
        <Space>
          <Switch 
            checked={isGuildMemberMode}
            onChange={setIsGuildMemberMode}
            checkedChildren={t('screenshot.guildMemberMode')}
            unCheckedChildren={t('screenshot.normalMode')}
          />
          <Switch 
            checked={debugMode}
            onChange={setDebugMode}
            checkedChildren="Debug Mode"
            unCheckedChildren="Normal Mode"
          />
          <Button 
            size="small" 
            onClick={fetchOCRStatus}
            icon={<EyeOutlined />}
          >
            {t('screenshot.ocrStatus')}
          </Button>
          <Button 
            size="small" 
            onClick={handleReinitializeOCR}
          >
            {t('screenshot.reinitializeOcr')}
          </Button>
        </Space>
      }>
        <div className="upload-section">
          <Upload
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleFileListChange}
            accept="image/*"
            multiple={true}
            showUploadList={{
              showRemoveIcon: true,
              showPreviewIcon: true,
            }}
          >
            <Button icon={<UploadOutlined />}>{t('screenshot.selectImage')}</Button>
          </Upload>
          
          <Button
            type="primary"
            onClick={handleUpload}
            disabled={fileList.length === 0}
            loading={uploading}
            style={{ marginTop: 16 }}
          >
            {uploading ? t('screenshot.analyzing') : t('screenshot.analyze')}
          </Button>
        </div>

        {ocrStatus && (
          <Card size="small" style={{ marginTop: 16 }}>
            <Title level={5}>OCR Service Status</Title>
            <div>
              <Text>Initialization Status: </Text>
              <Tag color={ocrStatus.isInitialized ? 'green' : 'red'}>
                {ocrStatus.isInitialized ? 'Initialized' : 'Not Initialized'}
              </Tag>
            </div>
            <div>
              <Text>Worker Status: </Text>
              <Tag color={ocrStatus.workerStatus === 'active' ? 'green' : 'red'}>
                {ocrStatus.workerStatus}
              </Tag>
            </div>
            <div>
              <Text>Supported Languages: </Text>
              {ocrStatus.supportedLanguages?.map((lang: string) => (
                <Tag key={lang} color="blue">{lang}</Tag>
              ))}
            </div>
          </Card>
        )}

        {ocrResult && (
          <Card style={{ marginTop: 16 }}>
            <Tabs defaultActiveKey="1">
              <TabPane tab="Recognition Result" key="1">
                {ocrResult.success ? (
                  <div>
                    <Space style={{ marginBottom: 16 }}>
                      <Tag color="green">Recognition Success</Tag>
                      {ocrResult.confidence && (
                        <Tag color="blue">Confidence: {Math.round(ocrResult.confidence)}%</Tag>
                      )}
                      {ocrResult.processingTime && (
                        <Tag color="orange">Processing Time: {ocrResult.processingTime}ms</Tag>
                      )}
                      <Button 
                        size="small" 
                        icon={<DownloadOutlined />}
                        onClick={() => downloadJSON(ocrResult, 'ocr-result.json')}
                      >
                        Download Result
                      </Button>
                      {ocrResult.data && ocrResult.data.multipleFiles && (
                        <Tag color="blue">
                          Multiple Files: {ocrResult.data.processedCount}/{ocrResult.data.totalFiles}
                        </Tag>
                      )}
                      {debugMode && (
                        <>
                          <Tag color="purple">Debug Mode</Tag>
                          {ocrResult.data && ocrResult.data.template && (
                            <Tag color="cyan">
                              Template: {ocrResult.data.template.name}
                            </Tag>
                          )}
                        </>
                      )}
                    </Space>
                    
                    {isGuildMemberMode ? (
                      renderGuildMembers()
                    ) : (
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 16, 
                        borderRadius: 4,
                        maxHeight: 400,
                        overflow: 'auto'
                      }}>
                        {JSON.stringify(ocrResult.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div>
                    <Tag color="red">Recognition Failed</Tag>
                    <Text type="danger">{ocrResult.error}</Text>
                  </div>
                )}
              </TabPane>
              
              <TabPane tab="Raw Text" key="2">
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Button 
                      size="small" 
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        const textData = {
                          rawText: ocrResult.text,
                          timestamp: new Date().toISOString(),
                          confidence: ocrResult.confidence,
                          processingTime: ocrResult.processingTime
                        };
                        downloadJSON(textData, 'raw-text.json');
                      }}
                    >
                      Download Raw Text
                    </Button>
                    <Text type="secondary">Text content directly recognized by OCR</Text>
                  </Space>
                  
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: 16, 
                    borderRadius: 4,
                    maxHeight: 400,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    lineHeight: '1.4'
                  }}>
                    {ocrResult.text || 'No text content'}
                  </pre>
                </div>
              </TabPane>
              
              <TabPane tab="Complete OCR Data" key="3">
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Button 
                      size="small" 
                      icon={<DownloadOutlined />}
                      onClick={() => downloadJSON(ocrResult, 'complete-ocr-data.json')}
                    >
                      Download Complete Data
                    </Button>
                    <Text type="secondary">Contains all raw information recognized by OCR</Text>
                  </Space>
                  
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: 16, 
                    borderRadius: 4,
                    maxHeight: 400,
                    overflow: 'auto',
                    fontSize: '12px'
                  }}>
                    {JSON.stringify(ocrResult, null, 2)}
                  </pre>
                </div>
              </TabPane>
              
              <TabPane tab="Server Data" key="4">
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Button 
                      size="small" 
                      icon={<DownloadOutlined />}
                      onClick={() => downloadJSON(ocrResult.data, 'server-response-data.json')}
                    >
                      Download Server Data
                    </Button>
                    <Text type="secondary">Structured data processed by server</Text>
                  </Space>
                  
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: 16, 
                    borderRadius: 4,
                    maxHeight: 400,
                    overflow: 'auto',
                    fontSize: '12px'
                  }}>
                    {JSON.stringify(ocrResult.data, null, 2)}
                  </pre>
                </div>
              </TabPane>
              
              {debugMode && (
                <TabPane tab="Debug Info" key="debug">
                  <div>
                    <Space style={{ marginBottom: 16 }}>
                      <Button 
                        size="small" 
                        icon={<DownloadOutlined />}
                        onClick={() => {
                          const debugData = {
                            fileInfos: ocrResult.data?.fileInfos,
                            processingDetails: {
                              multipleFiles: ocrResult.data?.multipleFiles,
                              processedCount: ocrResult.data?.processedCount,
                              totalFiles: ocrResult.data?.totalFiles,
                              timestamp: ocrResult.data?.timestamp,
                            },
                            template: ocrResult.data?.template,
                            confidence: ocrResult.confidence,
                            processingTime: ocrResult.processingTime,
                            fullResponse: ocrResult
                          };
                          downloadJSON(debugData, 'debug-info.json');
                        }}
                      >
                        Download Debug Info
                      </Button>
                      <Text type="secondary">Contains debug data including file info and processing details</Text>
                    </Space>
                    
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>File Processing Info:</Text>
                      {ocrResult.data?.fileInfos && (
                        <pre style={{ 
                          background: '#f0f0f0', 
                          padding: 8, 
                          marginTop: 8,
                          borderRadius: 4,
                          fontSize: '11px'
                        }}>
                          {JSON.stringify(ocrResult.data.fileInfos, null, 2)}
                        </pre>
                      )}
                    </div>
                    
                    <div>
                      <Text strong>Complete Response Data:</Text>
                      <pre style={{ 
                        background: '#f0f0f0', 
                        padding: 8, 
                        marginTop: 8,
                        borderRadius: 4,
                        maxHeight: 300,
                        overflow: 'auto',
                        fontSize: '10px'
                      }}>
                        {JSON.stringify(ocrResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                </TabPane>
              )}
              
              <TabPane tab="Guild Member Data" key="5">
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />}
                      onClick={() => downloadJSON(guildMembers, 'guild_member_data.json')}
                    >
                      Download Guild Member Data
                    </Button>
                    <Text>Total {guildMembers.length} {t('template.units.members')}</Text>
                  </Space>
                  
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: 16, 
                    borderRadius: 4,
                    maxHeight: 400,
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(guildMembers, null, 2)}
                  </pre>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default ScreenshotUpload;