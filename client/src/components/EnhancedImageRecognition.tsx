import React, { useState, useCallback } from 'react';
import { 
  Modal, 
  Upload, 
  Button, 
  Select, 
  Space, 
  Card, 
  Typography, 
  message, 
  List, 
  Image, 
  Progress,
  Tabs,
  Divider,
  Switch,
  Tag
} from 'antd';
import { 
  DeleteOutlined, 
  SettingOutlined,
  CameraOutlined,
  FileImageOutlined,
  PlayCircleOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { RcFile } from 'antd/es/upload';
import TemplateManager from './TemplateManager';
import { OCRTemplate } from '../types';
import { templateApi, uploadScreenshot } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import './ImageRecognition.css';

const { Option } = Select;
const { Text } = Typography;
const { TabPane } = Tabs;

interface EnhancedImageRecognitionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any[], module: string) => void;
  module: 'kvm' | 'gvg' | 'aa' | 'guild';
}

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
}

const EnhancedImageRecognition: React.FC<EnhancedImageRecognitionProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  module 
}) => {
  const { t } = useTranslation();
  
  // Translate default template names
  const translateTemplateName = (name: string): string => {
    const templateNameMap: { [key: string]: string } = {
      'Default Guild Member Template': t('templates.defaultGuildTemplate'),
      'Default KVM Template': t('templates.defaultKVMTemplate'),
      'Default GVG Template': t('templates.defaultGVGTemplate'),
      'Default AA Template': t('templates.defaultAATemplate'),
    };
    return templateNameMap[name] || name;
  };
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<OCRTemplate | null>(null);
  const [templates, setTemplates] = useState<OCRTemplate[]>([]);
  const [templateManagerVisible, setTemplateManagerVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [rawOcrData, setRawOcrData] = useState<any[]>([]);
  // const fileInputRef = useRef<HTMLInputElement>(null);

  // Load templates
  const loadTemplates = async () => {
    try {
      const response = await templateApi.getTemplates(module);
      if (response.data.success) {
        const templateList = response.data.data || [];
        setTemplates(templateList);
        
        // Automatically select default template
        const defaultTemplate = templateList.find((t: OCRTemplate) => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate);
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      message.error(t('enhancedImageRecognition.loadTemplateFailed'));
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, module]);

  // Handle file selection
  const handleFileSelect = useCallback((fileList: RcFile[]) => {
    console.log('File select triggered, fileList length:', fileList.length);
    
    // Completely replace image list instead of adding to avoid duplicates
    const newImages: ImageItem[] = fileList.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));
    
    console.log('Setting images to length:', newImages.length);
    setImages(newImages); // Set directly, don't use prev
  }, []);

  // Handle clipboard paste
  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (items) {
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }
      
      if (imageFiles.length > 0) {
        const newImages: ImageItem[] = imageFiles.map((file, index) => ({
          id: `paste-${Date.now()}-${index}`,
          file,
          preview: URL.createObjectURL(file),
          status: 'pending'
        }));
        setImages(prev => [...prev, ...newImages]);
        message.success(`${t('enhancedImageRecognition.pastedImages')} ${imageFiles.length} ${t('enhancedImageRecognition.imagesUnit')}`);
      }
    }
  }, []);

  // Listen for clipboard events
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [isOpen, handlePaste]);

  // Remove image
  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  // Clear all images
  const handleClearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setResults([]);
    setRawOcrData([]);
    setProgress(0);
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

  // Save recognition results to system
  const handleSaveResults = async () => {
    if (results.length === 0) {
      message.warning(t('enhancedImageRecognition.noDataToSave'));
      return;
    }

    try {
      await onSuccess(results, module);
      message.success(t('enhancedImageRecognition.dataSaved'));
      // For guild members, clear results to avoid duplicate saves
      if (module === 'guild') {
        setResults([]);
        setImages([]);
        setRawOcrData([]);
      }
    } catch (error) {
      console.error('Failed to save data:', error);
      message.error(t('enhancedImageRecognition.saveFailed'));
    }
  };

  // Start batch recognition
  const handleStartRecognition = async () => {
    if (images.length === 0) {
      message.warning(t('enhancedImageRecognition.pleaseAddImages'));
      return;
    }

    if (!selectedTemplate) {
      message.warning(t('enhancedImageRecognition.pleaseSelectTemplate'));
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResults([]);
    setRawOcrData([]);

    // Set all image status to processing
    setImages(prev => prev.map(img => ({ ...img, status: 'processing' as const })));

    try {
      // Create single FormData containing all images
      const formData = new FormData();
      images.forEach((image) => {
        formData.append('screenshots', image.file); // Use screenshots field to support multiple files
      });
      formData.append('templateId', selectedTemplate.id);
      formData.append('module', module);

      const response = await uploadScreenshot(formData);
      setProgress(50); // Upload complete, set progress to 50%

      if (response.success && response.data) {
        const processedData = processRecognitionResult(response.data);
        
        // Save raw OCR data
        const rawData = {
          batchResponse: response,
          processedData: processedData,
          imageCount: images.length,
          timestamp: new Date().toISOString()
        };
        
        setRawOcrData([rawData]);
        setProgress(100); // Processing complete
        
        // Update all image status to completed
        setImages(prev => prev.map(img => ({ 
          ...img, 
          status: 'completed' as const, 
          result: processedData 
        })));

        if (processedData && processedData.length > 0) {
          setResults(processedData);
          let successMessage = `${t('enhancedImageRecognition.batchRecognitionComplete')} ${processedData.length} ${t('enhancedImageRecognition.dataItemsUnit')}`;
          
          // If AA module and images were saved, show save info
          if (module === 'aa' && response.data.savedImages && response.data.savedImages.count > 0) {
            const imageInfo = response.data.savedImages;
            const dirName = imageInfo.directory ? imageInfo.directory.split('/').pop() || imageInfo.directory.split('\\').pop() : '';
            successMessage += `\nSaved ${imageInfo.count} images to date directory: ${dirName}`;
            message.success(successMessage, 5); // Show for 5 seconds
          } else {
            message.success(successMessage);
          }
          
          // For guild member module, don't auto-call success callback, user needs to save manually
          if (module !== 'guild') {
            onSuccess(processedData, module);
          }
        } else {
          message.warning(t('enhancedImageRecognition.noValidDataRecognized'));
          // Set image status to error
          setImages(prev => prev.map(img => ({ 
            ...img, 
            status: 'error' as const, 
            error: t('enhancedImageRecognition.noValidDataRecognized') 
          })));
        }
      } else {
        // Update all image status to error
        setImages(prev => prev.map(img => ({ 
          ...img, 
          status: 'error' as const, 
          error: response.error || t('enhancedImageRecognition.recognitionFailed') 
        })));
        message.error(response.error || t('enhancedImageRecognition.batchRecognitionFailed'));
      }
    } catch (error) {
      console.error('Batch recognition failed:', error);
      message.error(t('enhancedImageRecognition.batchRecognitionFailed'));
      // Update all image status to error
      setImages(prev => prev.map(img => ({ 
        ...img, 
        status: 'error' as const, 
        error: t('enhancedImageRecognition.processingFailed') 
      })));
    } finally {
      setProcessing(false);
    }
  };

  // Process recognition results
  const processRecognitionResult = (data: any) => {
    // Process recognition results based on different modules and templates
    // Data conversion can be done based on selectedTemplate.template configuration
    if (!data) return [];

    switch (module) {
      case 'guild':
        return processGuildMemberData(data);
      case 'kvm':
        return processKVMData(data);
      case 'gvg':
        return processGVGData(data);
      case 'aa':
        return processAAData(data);
      default:
        return [];
    }
  };

  // Process guild member data (supports enhanced recognition mode)
  const processGuildMemberData = (ocrData: any) => {
    console.log('Processing guild member data:', ocrData);
    
    if (!ocrData) return [];

    // Check if server has already processed template data (enhanced recognition mode)
    if (ocrData && typeof ocrData === 'object') {
      // New batch processing logic - directly check if ocrResult is merged guild member data
      if (ocrData.ocrResult && Array.isArray(ocrData.ocrResult) && ocrData.ocrResult.length > 0) {
        // Check if first element contains guild member fields
        const firstItem = ocrData.ocrResult[0];
        if (firstItem && (firstItem.name || firstItem.id || firstItem.level)) {
          console.log('Found processed guild member data:', ocrData.ocrResult);
          return ocrData.ocrResult;
        }
      }
      
      // If server returned already processed data structure (direct member array)
      if (Array.isArray(ocrData) && ocrData.length > 0) {
        const firstItem = ocrData[0];
        if (firstItem && (firstItem.name || firstItem.id || firstItem.level)) {
          console.log('Found direct guild member array:', ocrData);
          return ocrData;
        }
      }
      
      // Compatible with old batch processing results (array format)
      if (ocrData.ocrResult && Array.isArray(ocrData.ocrResult)) {
        const processedResults = ocrData.ocrResult.filter((item: any) => 
          item.data && Array.isArray(item.data)
        );
        if (processedResults.length > 0) {
          console.log('Found batch processed guild data:', processedResults);
          // Merge all batch member data
          const allMembers = processedResults.reduce((acc: any[], item: any) => {
            return acc.concat(item.data || []);
          }, []);
          return allMembers;
        }
      }
    }

    // If server hasn't processed, use raw text parsing (fallback mode)
    console.log('Falling back to raw text parsing');
    const members: any[] = [];
    let rawText = '';
    
    if (ocrData.ocrResult && ocrData.ocrResult.rawText) {
      rawText = ocrData.ocrResult.rawText;
    } else if (ocrData.rawText) {
      rawText = ocrData.rawText;
    } else {
      return members;
    }
    
    if (rawText) {
      const lines = rawText.split('\n');
      let memberIndex = 1;
      
      lines.forEach((line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0) {
          if (trimmedLine.includes('oO') || trimmedLine.includes('©') || trimmedLine.length < 10) {
            return;
          }
          
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

  // Guild member parsing (fallback mode) - parse in fixed order: name, gender, level, class, position, 7-day contribution, total contribution, online status
  // Standardize job class names function
  const standardizeJobClass = (jobClass: string): string => {
    const jobMapping: { [key: string]: string } = {
      'High Wizzard': 'High Wizard',
      'Wizzard': 'Wizard'
    };
    
    return jobMapping[jobClass] || jobClass;
  };

  const parseGuildMemberLine = (line: string, index: number) => {
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
    
    const result = {
      id: index,
      index: index,
      name: '',
      level: 1,
      class: ''
    };
    
    // Parse from back to front: find level (number) first, then class, remaining is name
    let levelIndex = -1;
    let jobIndex = -1;
    
    // 1. Find level (find first pure number from back to front)
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(parts[i])) {
        levelIndex = i;
        result.level = parseInt(parts[i]);
        break;
      }
    }
    
    if (levelIndex === -1) return null; // No level found, invalid data
    
    // 2. Find class (in the part after level)
    let foundJob = '';
    
    // Try to match three-word class
    if (levelIndex + 3 < parts.length) {
      const threeWordJob = `${parts[levelIndex + 1]} ${parts[levelIndex + 2]} ${parts[levelIndex + 3]}`;
      const matchedThreeWord = jobClasses.find(job => job.toLowerCase() === threeWordJob.toLowerCase());
      if (matchedThreeWord) {
        foundJob = matchedThreeWord;
        jobIndex = levelIndex + 3;
      }
    }
    
    // Try to match two-word class
    if (!foundJob && levelIndex + 2 < parts.length) {
      const twoWordJob = `${parts[levelIndex + 1]} ${parts[levelIndex + 2]}`;
      const matchedTwoWord = jobClasses.find(job => job.toLowerCase() === twoWordJob.toLowerCase());
      if (matchedTwoWord) {
        foundJob = matchedTwoWord;
        jobIndex = levelIndex + 2;
      }
    }
    
    // Try to match single-word class
    if (!foundJob && levelIndex + 1 < parts.length) {
      const singleWordJob = parts[levelIndex + 1];
      const matchedSingleWord = jobClasses.find(job => job.toLowerCase() === singleWordJob.toLowerCase());
      if (matchedSingleWord) {
        foundJob = matchedSingleWord;
        jobIndex = levelIndex + 1;
      }
    }
    
    if (!foundJob) return null; // No class found, invalid data
    
    result.class = standardizeJobClass(foundJob);
    
    // 3. Parse name (all parts before level, remove last possible gender identifier)
    if (levelIndex > 0) {
      const nameParts = parts.slice(0, levelIndex);
      // Remove last character as it might be gender identifier (like é, ♂, ♀, etc.)
      if (nameParts.length > 1) {
        nameParts.pop();
      }
      result.name = nameParts.join(' ').trim();
      if (!result.name) {
        return null; // No valid name, invalid data
      }
    } else {
      return null; // No name part, invalid data
    }
    
    return result;
  };

  // Process KVM data
  const processKVMData = (ocrData: any) => {
    console.log('Processing KVM data:', ocrData);
    
    // Check if server has already processed template data
    if (ocrData && typeof ocrData === 'object') {
      // New batch processing logic - directly check if ocrResult is merged KVM data
      if (ocrData.ocrResult && ocrData.ocrResult.event_type === 'KVM' && ocrData.ocrResult.non_participants) {
        console.log('Found merged KVM template data:', ocrData.ocrResult);
        return [ocrData.ocrResult];
      }
      
      // If server returned already processed data structure
      if (ocrData.event_type === 'KVM' && ocrData.non_participants) {
        console.log('Found processed KVM data:', ocrData);
        return [ocrData];
      }
      
      // Compatible with old batch processing results (array format)
      if (ocrData.ocrResult && Array.isArray(ocrData.ocrResult)) {
        const processedResults = ocrData.ocrResult.filter((item: any) => 
          item.data && item.data.event_type === 'KVM'
        );
        if (processedResults.length > 0) {
          console.log('Found batch processed KVM data:', processedResults);
          return processedResults.map((item: any) => item.data);
        }
      }
    }
    
    // If server hasn't processed, return default structure
    console.log('No processed KVM data found, returning default structure');
    return [{
      date: new Date().toISOString().split('T')[0],
      event_type: 'KVM',
      non_participants: []
    }];
  };

  // Process GVG data
  const processGVGData = (ocrData: any) => {
    console.log('Processing GVG data:', ocrData);
    
    // Check if server has already processed template data
    if (ocrData && typeof ocrData === 'object') {
      // New batch processing logic - directly check if ocrResult is merged GVG data
      if (ocrData.ocrResult && ocrData.ocrResult.event_type === 'GVG' && ocrData.ocrResult.non_participants) {
        console.log('Found merged GVG template data:', ocrData.ocrResult);
        return [ocrData.ocrResult];
      }
      
      // If server returned already processed data structure
      if (ocrData.event_type === 'GVG' && ocrData.non_participants) {
        console.log('Found processed GVG data:', ocrData);
        return [ocrData];
      }
      
      // Compatible with old batch processing results (array format)
      if (ocrData.ocrResult && Array.isArray(ocrData.ocrResult)) {
        const processedResults = ocrData.ocrResult.filter((item: any) => 
          item.data && item.data.event_type === 'GVG'
        );
        if (processedResults.length > 0) {
          console.log('Found batch processed GVG data:', processedResults);
          return processedResults.map((item: any) => item.data);
        }
      }
    }
    
    // If server hasn't processed, return default structure
    console.log('No processed GVG data found, returning default structure');
    return [{
      date: new Date().toISOString().split('T')[0],
      event_type: 'GVG',
      non_participants: []
    }];
  };

  // Process AA data
  const processAAData = (ocrData: any) => {
    console.log('Processing AA data:', ocrData);
    
    // Check if server has already processed template data
    if (ocrData && typeof ocrData === 'object') {
      // New batch processing logic - directly check if ocrResult is merged AA data
      if (ocrData.ocrResult && ocrData.ocrResult.event_type === 'AA' && ocrData.ocrResult.participants) {
        console.log('Found merged AA template data:', ocrData.ocrResult);
        return [ocrData.ocrResult];
      }
      
      // If server returned already processed data structure
      if (ocrData.event_type === 'AA' && ocrData.participants) {
        console.log('Found processed AA data:', ocrData);
        return [ocrData];
      }
      
      // Compatible with old batch processing results (array format)
      if (ocrData.ocrResult && Array.isArray(ocrData.ocrResult)) {
        const processedResults = ocrData.ocrResult.filter((item: any) => 
          item.data && item.data.event_type === 'AA'
        );
        if (processedResults.length > 0) {
          console.log('Found batch processed AA data:', processedResults);
          return processedResults.map((item: any) => item.data);
        }
      }
    }
    
    // If server hasn't processed, return default structure
    console.log('No processed AA data found, returning default structure');
    return [{
      date: new Date().toISOString().split('T')[0],
      event_type: 'AA',
      participants: []
    }];
  };

  const uploadProps = {
    multiple: true,
    accept: 'image/*',
    beforeUpload: (_file: RcFile, fileList: RcFile[]) => {
      console.log('beforeUpload called with fileList length:', fileList.length);
      handleFileSelect(fileList);
      return false; // Prevent automatic upload
    },
    onChange: (info: any) => {
      console.log('Upload onChange called with fileList length:', info.fileList.length);
      // Use onChange as backup to ensure file selection is handled correctly
      if (info.fileList.length !== images.length) {
        handleFileSelect(info.fileList);
      }
    },
    showUploadList: false,
  };

  return (
    <>
      <Modal
        title={`${t('enhancedImageRecognition.title')} - ${module.toUpperCase()}`}
        open={isOpen}
        onCancel={onClose}
        width={1200}
        footer={null}
      >
        <div style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
          {/* Control Panel */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space wrap>
              <Space>
                <Switch 
                  checked={debugMode}
                  onChange={setDebugMode}
                  checkedChildren={t('enhancedImageRecognition.debugMode')}
                  unCheckedChildren={t('enhancedImageRecognition.normalMode')}
                  size="small"
                />
                <Text>{t('enhancedImageRecognition.recognitionTemplate')}：</Text>
                <Select
                  style={{ width: 200 }}
                  placeholder={t('enhancedImageRecognition.selectRecognitionTemplate')}
                  value={selectedTemplate?.id}
                  onChange={(value) => {
                    const template = templates.find(t => t.id === value);
                    setSelectedTemplate(template || null);
                  }}
                >
                  {templates.map(template => (
                    <Option key={template.id} value={template.id}>
                      {translateTemplateName(template.name)} {template.isDefault && `(${t('enhancedImageRecognition.defaultTemplate')})`}
                    </Option>
                  ))}
                </Select>
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => setTemplateManagerVisible(true)}
                >
                  {t('enhancedImageRecognition.templateManagement')}
                </Button>
              </Space>
              
              <Divider type="vertical" />
              
              <Space>
                <Upload {...uploadProps}>
                  <Button icon={<FileImageOutlined />}>{t('enhancedImageRecognition.selectImages')}</Button>
                </Upload>
                
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartRecognition}
                  disabled={images.length === 0 || !selectedTemplate || processing}
                  loading={processing}
                >
                  {t('enhancedImageRecognition.startRecognition')}
                </Button>
                
                <Button
                  onClick={handleClearAll}
                  disabled={processing}
                >
                  {t('enhancedImageRecognition.clearAll')}
                </Button>
              </Space>
            </Space>
            
            {processing && (
              <div style={{ marginTop: 8 }}>
                <Progress percent={Math.round(progress)} size="small" />
              </div>
            )}
          </Card>

          {/* Main Content Area */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Tabs defaultActiveKey="images" style={{ height: '100%' }}>
              <TabPane tab={`${t('enhancedImageRecognition.imageList')} (${images.length})`} key="images">
                <div style={{ height: '50vh', overflow: 'auto' }}>
                  {images.length === 0 ? (
                    <div 
                      style={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: '#999',
                        fontSize: '16px'
                      }}
                    >
                      <CameraOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                      <p>{t('enhancedImageRecognition.noImages')}</p>
                      <p style={{ fontSize: '14px' }}>{t('enhancedImageRecognition.supportPaste')}</p>
                    </div>
                  ) : (
                    <List
                      grid={{ gutter: 16, column: 4 }}
                      dataSource={images}
                      renderItem={(image) => (
                        <List.Item>
                          <Card
                            size="small"
                            cover={
                              <div style={{ position: 'relative' }}>
                                <Image
                                  width="100%"
                                  height={120}
                                  src={image.preview}
                                  style={{ objectFit: 'cover' }}
                                />
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  style={{ 
                                    position: 'absolute', 
                                    top: 4, 
                                    right: 4,
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)'
                                  }}
                                  onClick={() => handleRemoveImage(image.id)}
                                />
                              </div>
                            }
                          >
                            <div style={{ textAlign: 'center' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {getStatusText(image.status)}
                              </Text>
                              {image.error && (
                                <div>
                                  <Text type="danger" style={{ fontSize: '12px' }}>
                                    {image.error}
                                  </Text>
                                </div>
                              )}
                              {image.result && Array.isArray(image.result) && (
                                <div>
                                  <Text type="success" style={{ fontSize: '12px' }}>
                                    {image.result.length} {t('enhancedImageRecognition.dataItems')}
                                  </Text>
                                </div>
                              )}
                            </div>
                          </Card>
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              </TabPane>
              
              <TabPane tab={`${t('enhancedImageRecognition.recognitionResults')} (${results.length})`} key="results">
                <div style={{ height: '50vh', overflow: 'auto' }}>
                  {results.length > 0 ? (
                    <div>
                      <Space style={{ marginBottom: 16 }}>
                        {module === 'guild' && (
                          <Button 
                            type="primary"
                            size="small" 
                            onClick={handleSaveResults}
                            disabled={results.length === 0}
                          >
                            {t('enhancedImageRecognition.saveToGuildMembers')}
                          </Button>
                        )}
                        <Button 
                          size="small" 
                          icon={<DownloadOutlined />}
                          onClick={() => downloadJSON(results, `${module}-processed-results.json`)}
                        >
                          {t('enhancedImageRecognition.downloadProcessedResults')}
                        </Button>
                        <Tag color="green">{t('enhancedImageRecognition.totalDataItems')} {results.length} {t('enhancedImageRecognition.dataItems')}</Tag>
                        {debugMode && (
                          <Tag color="purple">{t('enhancedImageRecognition.debugMode')}</Tag>
                        )}
                      </Space>
                      <pre style={{
                        backgroundColor: '#f5f5f5',
                        padding: '16px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {JSON.stringify(results, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      <FileImageOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                      <p>{t('enhancedImageRecognition.resultsWillShowHere')}</p>
                    </div>
                  )}
                </div>
              </TabPane>
              
              {debugMode && rawOcrData.length > 0 && (
                <TabPane tab={t('enhancedImageRecognition.rawOcrData')} key="raw-data">
                  <div style={{ height: '50vh', overflow: 'auto' }}>
                    <Space style={{ marginBottom: 16 }}>
                      <Button 
                        size="small" 
                        icon={<DownloadOutlined />}
                        onClick={() => downloadJSON(rawOcrData, `${module}-raw-ocr-data.json`)}
                      >
                        {t('enhancedImageRecognition.downloadRawData')}
                      </Button>
                      <Tag color="blue">{t('enhancedImageRecognition.totalDataItems')} {rawOcrData.length} {t('enhancedImageRecognition.batchResults')}</Tag>
                      <Button 
                        size="small" 
                        onClick={() => {
                          const textData = rawOcrData.map(item => ({
                            batchInfo: {
                              imageCount: item.imageCount,
                              timestamp: item.timestamp
                            },
                            rawText: item.batchResponse?.data?.rawText || '',
                            confidence: item.batchResponse?.data?.confidence || 0,
                            fileInfos: item.batchResponse?.data?.fileInfos || []
                          }));
                          downloadJSON(textData, `${module}-batch-raw-text.json`);
                        }}
                      >
                        {t('enhancedImageRecognition.downloadBatchText')}
                      </Button>
                    </Space>
                    
                    {rawOcrData.map((item, index) => (
                      <div key={index} style={{ marginBottom: 24 }}>
                        <div style={{ marginBottom: 8 }}>
                          <Tag color="cyan">{t('enhancedImageRecognition.batchProcessingResult')}</Tag>
                          <Tag color="green">{t('enhancedImageRecognition.imageCount')}: {item.imageCount}</Tag>
                          {item.batchResponse?.data?.confidence && (
                            <Tag color="blue">{t('enhancedImageRecognition.averageConfidence')}: {Math.round(item.batchResponse.data.confidence)}%</Tag>
                          )}
                          {item.batchResponse?.data?.processedCount && (
                            <Tag color="purple">{t('enhancedImageRecognition.processedSuccessfully')}: {item.batchResponse.data.processedCount}/{item.batchResponse.data.totalFiles}</Tag>
                          )}
                          {item.batchResponse?.data?.savedImages && (
                            <Tag color="orange">Saved Images: {item.batchResponse.data.savedImages.count}</Tag>
                          )}
                        </div>
                        
                        <Card size="small" title={t('enhancedImageRecognition.batchRawText')}>
                          <pre style={{ 
                            background: '#f0f0f0', 
                            padding: 12, 
                            borderRadius: 4,
                            fontSize: '11px',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {item.batchResponse?.data?.rawText || t('enhancedImageRecognition.noTextContent')}
                          </pre>
                        </Card>
                        
                        {item.batchResponse?.data?.fileInfos && (
                          <Card size="small" title={t('enhancedImageRecognition.fileProcessingDetails')} style={{ marginTop: 8 }}>
                            <div style={{ marginBottom: 8 }}>
                              {item.batchResponse.data.fileInfos.map((fileInfo: any, fileIndex: number) => (
                                <div key={fileIndex} style={{ marginBottom: 4 }}>
                                  <Tag color={fileInfo.processed ? 'green' : 'red'}>
                                    {fileInfo.originalName} ({fileInfo.size}bytes)
                                  </Tag>
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                        
                        <Card size="small" title={t('enhancedImageRecognition.completeBatchResponseData')} style={{ marginTop: 8 }}>
                          <pre style={{ 
                            background: '#f0f0f0', 
                            padding: 12, 
                            borderRadius: 4,
                            fontSize: '10px',
                            maxHeight: 200,
                            overflow: 'auto'
                          }}>
                            {JSON.stringify(item.batchResponse, null, 2)}
                          </pre>
                        </Card>
                      </div>
                    ))}
                  </div>
                </TabPane>
              )}
            </Tabs>
          </div>
        </div>
      </Modal>

      {/* Template Manager */}
      <TemplateManager
        module={module}
        visible={templateManagerVisible}
        onClose={() => {
          setTemplateManagerVisible(false);
          loadTemplates(); // Reload templates
        }}
      />
    </>
  );

  function getStatusText(status: ImageItem['status']) {
    switch (status) {
      case 'pending': return t('enhancedImageRecognition.statusPending');
      case 'processing': return t('enhancedImageRecognition.statusProcessing');
      case 'completed': return t('enhancedImageRecognition.statusCompleted');
      case 'error': return t('enhancedImageRecognition.statusError');
      default: return t('enhancedImageRecognition.statusUnknown');
    }
  }
};

export default EnhancedImageRecognition;