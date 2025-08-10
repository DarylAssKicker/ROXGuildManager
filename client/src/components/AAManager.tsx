import React, { useState, useEffect } from 'react';
import { Button, Upload, Modal, Input, message, Space, Card, Typography, Table, Popconfirm, Tag, DatePicker } from 'antd';
import { UploadOutlined, FileTextOutlined, CameraOutlined, ImportOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/es/upload';
import EnhancedImageRecognition from './EnhancedImageRecognition';
import AAImageViewer from './AAImageViewer';
import { aaApi, guildMembersApi, classesApi } from '../services/api';
import { AAInfo } from '../types';
import dayjs from 'dayjs';
import DataManager from '../services/DataManager';
import { useTranslation } from '../hooks/useTranslation';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface AAManagerProps {}

const AAManager: React.FC<AAManagerProps> = () => {
  const { t } = useTranslation();
  const [isImageRecognitionVisible, setIsImageRecognitionVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importType, setImportType] = useState<'file' | 'text'>('file');
  const [jsonText, setJsonText] = useState('');
  const [importedData, setImportedData] = useState<AAInfo[]>([]);
  const [serverData, setServerData] = useState<AAInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AAInfo | null>(null);
  const [guildMembers, setGuildMembers] = useState<any[]>([]);
  const [editingParticipants, setEditingParticipants] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string>('');
  const [isDateEditing, setIsDateEditing] = useState<boolean>(false);
  const [classes, setClasses] = useState<{id: string, name: string, color?: string}[]>([]);
  const [imageViewerVisible, setImageViewerVisible] = useState<boolean>(false);
  const [selectedImageDate, setSelectedImageDate] = useState<string>('');
  
  // Get DataManager instance
  const dataManager = DataManager.getInstance();

  // Load guild member data
  const loadGuildMembers = async () => {
    try {
      // First check if data already exists in DataManager
      const existingMembers = dataManager.getGuildMembers();
      if (existingMembers.length > 0) {
        console.log('Get guild member data from DataManager, total', existingMembers.length, 'members');
        setGuildMembers(existingMembers);
        return;
      }

      // Get guild member data from API
      console.log('Getting guild member data from API...');
      const response = await guildMembersApi.getAll();
      
      if (response.data.success && response.data.data) {
        const members = response.data.data;
        // Save to DataManager
        dataManager.setGuildMembers(members);
        setGuildMembers(members);
        console.log('Load and save guild member list to DataManager from API, total', members.length, 'members');
      } else {
        console.warn('Failed to get guild member data:', response.data.message);
      }
      
    } catch (error) {
      console.error('Failed to load guild members:', error);
      message.error(t('aa.loadServerDataError'));
    }
  };

  // Match guild member by name - using DataManager
  const findGuildMemberByName = (name: string) => {
    const member = dataManager.findGuildMemberByName(name);
    // Debug output
    if (!member) {
      const allMembers = dataManager.getGuildMembers();
      console.log(`Member not matched: "${name?.trim()}", total guild members:`, allMembers.length);
    }
    return member;
  };

  // Handle show details
  const handleShowDetails = (record: AAInfo) => {
    setSelectedRecord(record);
    setEditingParticipants([...(record.participants || [])]);
    setEditingDate(record.date);
    setIsDateEditing(false);
    setIsDetailModalVisible(true);
  };

  // Handle name editing - only modify participant names in AA data, save directly after editing
  const handleNameEdit = async (index: number, newName: string) => {
    // Update local state
    const updatedParticipants = [...editingParticipants];
    updatedParticipants[index] = { ...updatedParticipants[index], name: newName };
    setEditingParticipants(updatedParticipants);
    
    // Save directly to server
    if (selectedRecord) {
      try {
        setLoading(true);
        
        // Build updated AA data
        const updatedAAData = {
          ...selectedRecord,
          participants: updatedParticipants,
          total_participants: updatedParticipants.length
        };

        console.log('Auto save AA changes:', updatedAAData);
        
        // Delete original data
        const deleteResponse = await aaApi.deleteByDate(selectedRecord.date);
        if (!deleteResponse.data.success) {
          message.error(deleteResponse.data.message || 'Failed to delete AA data');
          return;
        }

        // Re-import modified data
        const importResponse = await aaApi.importData([updatedAAData]);
        
        if (importResponse.data.success) {
          message.success('AA data auto saved');
          // Update selectedRecord to reflect latest data
          setSelectedRecord(updatedAAData);
          // Reload server data
          await loadServerData();
        } else {
          message.error(importResponse.data.error || 'Auto save failed');
        }
      } catch (error) {
        console.error('Auto save failed:', error);
        message.error('Auto save failed, please try again');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle non-participant name editing
  const handleNonParticipantNameEdit = async (memberId: number, newName: string) => {
    try {
      await dataManager.updateGuildMemberName(memberId, newName);
      // Update local state to reflect changes
      setGuildMembers([...dataManager.getGuildMembers()]);
      message.success('Member name updated successfully');
    } catch (error) {
      console.error('Failed to update member name:', error);
      message.error('Failed to update member name, please try again');
    }
  };



  // Deduplicate participant list
  const deduplicateParticipants = (participants: any[]) => {
    const seen = new Set();
    return participants.filter(participant => {
      const name = participant.name?.trim();
      if (!name || seen.has(name)) {
        return false;
      }
      seen.add(name);
      return true;
    });
  };



  // Calculate matched guild members
  const getMatchedGuildMembers = () => {
    return editingParticipants.map(participant => ({
      ...participant,
      matchedMember: findGuildMemberByName(participant.name)
    }));
  };

  // Calculate non-participants - exclude AA participants from guild members
  const getUnparticipatedMembers = () => {
    const participantNames = editingParticipants.map(p => p.name?.trim()).filter(Boolean);
    return guildMembers.filter(member => {
      // Basic condition: has name and not participated
      if (!member.name?.trim() || participantNames.includes(member.name.trim())) {
        return false;
      }
      
      // If member has creation time and AA has date, exclude members created after AA time
      if (member.createdAt && editingDate) {
        const memberCreatedDate = dayjs(member.createdAt).format('YYYY-MM-DD');
        const aaDate = dayjs(editingDate).format('YYYY-MM-DD');
        
        // If member creation time is after AA time, exclude
        if (dayjs(memberCreatedDate).isAfter(dayjs(aaDate))) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Load server data
  const loadServerData = async () => {
    try {
      setLoading(true);
      const response = await aaApi.getAllDates();
      if (response.data.success) {
        const dates = response.data.data;
        const allData: AAInfo[] = [];
        
        for (const date of dates) {
          const dataResponse = await aaApi.getByDate(date);
          if (dataResponse.data.success) {
            allData.push(dataResponse.data.data);
          }
        }
        
        setServerData(allData);
      }
      
      // Load statistics
      const statsResponse = await aaApi.getStatistics();
      if (statsResponse.data.success) {
        setStatistics(statsResponse.data.data);
      }
    } catch (error) {
      message.error(t('aa.loadServerDataError'));
      console.error('Failed to load server data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen to guild member data changes in DataManager
  useEffect(() => {
    const handleDataChange = () => {
      const members = dataManager.getGuildMembers();
      setGuildMembers(members);
      // Force re-render to update matching effects
      if (selectedRecord) {
        setEditingParticipants([...editingParticipants]);
      }
    };

    // Add listener
    dataManager.addListener(handleDataChange);

    // Remove listener when component unmounts
    return () => {
      dataManager.removeListener(handleDataChange);
    };
  }, [dataManager, selectedRecord, editingParticipants]);

  // Load class configuration
  const loadClasses = async () => {
    try {
      const response = await classesApi.getAll();
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Failed to load class configuration:', error);
    }
  };

  // Get color by class name
  const getClassColor = (className: string) => {
    const classInfo = classes.find(c => c.name === className);
    const color = classInfo?.color || '#f0f0f0'; // Default light gray
    // Convert color to lighter background color
    return color + '40'; // Add transparency
  };

  // Get data when component loads
  useEffect(() => {
    loadServerData();
    loadGuildMembers();
    loadClasses();
  }, []);

  // Handle file upload
  const handleFileUpload = (file: RcFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        setImportedData(Array.isArray(data) ? data : [data]);
        message.success(t('aa.importSuccess'));
        setIsImportModalVisible(false);
      } catch (error) {
        message.error(t('aa.jsonFormatError'));
        console.error('Failed to parse JSON file:', error);
      }
    };
    reader.readAsText(file);
    return false; // Prevent automatic upload
  };

  // Handle text import
  const handleTextImport = () => {
    try {
      const data = JSON.parse(jsonText);
      setImportedData(Array.isArray(data) ? data : [data]);
      message.success(t('aa.importSuccess'));
      setIsImportModalVisible(false);
      setJsonText('');
    } catch (error) {
      message.error(t('aa.jsonFormatError'));
      console.error('Failed to parse JSON text:', error);
    }
  };

  // Handle image recognition success
  const handleImageRecognitionSuccess = (data: any[], module: string) => {
    if (module === 'aa') {
      setImportedData(data);
      message.success(t('aa.importSuccess'));
    }
  };

  // Save data to server
  const handleSaveToServer = async () => {
    if (importedData.length === 0) {
      message.warning(t('aa.noDataToSave'));
      return;
    }

    try {
      setLoading(true);
      console.log('Preparing to save AA data:', importedData);
      
      // Process each AA data, check if append is needed
      const processedData = [];
      for (const aaData of importedData) {
        const isTodayDate = aaData.date === new Date().toISOString().split('T')[0];
        
        if (isTodayDate) {
          try {
            // Check if same date data exists
            const existingResponse = await aaApi.getByDate(aaData.date);
            if (existingResponse.data.success) {
              // Same date data exists, append and deduplicate
              const existingParticipants = existingResponse.data.data.participants || [];
              const newParticipants = aaData.participants || [];
              const combinedParticipants = [...existingParticipants, ...newParticipants];
              const deduplicatedParticipants = deduplicateParticipants(combinedParticipants);
              
              console.log(`Found today's same date data, deduplicated after append: ${existingParticipants.length} + ${newParticipants.length} = ${deduplicatedParticipants.length}`);
              message.info(t('aa.mergedWithExistingData', { 
                existing: existingParticipants.length, 
                new: newParticipants.length, 
                final: deduplicatedParticipants.length 
              }));
              
              // Delete original data first
              await aaApi.deleteByDate(aaData.date);
              
              // Build merged data
              processedData.push({
                ...aaData,
                participants: deduplicatedParticipants,
                total_participants: deduplicatedParticipants.length
              });
            } else {
              // No same date data exists, use new data directly (still need deduplication)
              const deduplicatedParticipants = deduplicateParticipants(aaData.participants || []);
              processedData.push({
                ...aaData,
                participants: deduplicatedParticipants,
                total_participants: deduplicatedParticipants.length
              });
            }
          } catch (error) {
            console.log('Same date data does not exist, using new data');
            const deduplicatedParticipants = deduplicateParticipants(aaData.participants || []);
            processedData.push({
              ...aaData,
              participants: deduplicatedParticipants,
              total_participants: deduplicatedParticipants.length
            });
          }
        } else {
          // Non-today data, overwrite directly (but still need deduplication)
          const deduplicatedParticipants = deduplicateParticipants(aaData.participants || []);
          processedData.push({
            ...aaData,
            participants: deduplicatedParticipants,
            total_participants: deduplicatedParticipants.length
          });
        }
      }
      
      const response = await aaApi.importData(processedData);
      console.log('Server response:', response.data);
      
      if (response.data.success) {
        message.success(response.data.message || t('aa.saveSuccess'));
        setImportedData([]);
        // Reload server data
        await loadServerData();
      } else {
        console.error('Save failed, server response:', response.data);
        message.error(response.data.error || response.data.message || t('aa.saveError'));
      }
    } catch (error) {
      console.error('Failed to save to server:', error);
      message.error(t('aa.saveError'));
    } finally {
      setLoading(false);
    }
  };

  // Delete server data
  const handleDeleteServerData = async (date: string) => {
    try {
      const response = await aaApi.deleteByDate(date);
      
      if (response.data.success) {
        message.success(response.data.message || t('aa.deleteSuccess'));
        // Reload server data
        await loadServerData();
      } else {
        message.error(response.data.message || t('aa.deleteError'));
      }
    } catch (error) {
      message.error(t('aa.deleteError'));
      console.error('Failed to delete data:', error);
    }
  };

  // Clear data
  const handleClearData = () => {
    setImportedData([]);
    message.success(t('aa.dataCleared'));
  };

  // View AA images
  const handleViewImages = (date: string) => {
    setSelectedImageDate(date);
    setImageViewerVisible(true);
  };

  // Export data
  const handleExportData = () => {
    if (importedData.length === 0) {
      message.warning(t('aa.noDataToExport'));
      return;
    }

    const dataStr = JSON.stringify(importedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aa_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('Data exported successfully');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Action button area */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexShrink: 0 
      }}>
        <Title level={3} style={{ margin: 0 }}>{t('aa.title')}</Title>
        <Space>
          <Button
            icon={<ImportOutlined />}
            onClick={() => setIsImportModalVisible(true)}
            style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
          >
            {t('aa.importData')}
          </Button>
          <Button
            icon={<CameraOutlined />}
            onClick={() => setIsImageRecognitionVisible(true)}
            style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
          >
            {t('aa.imageRecognition')}
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={handleExportData}
            disabled={importedData.length === 0}
          >
            {t('aa.exportData')}
          </Button>
          <Button
            type="primary"
            onClick={handleSaveToServer}
            disabled={importedData.length === 0}
            loading={loading}
          >
            {t('aa.saveToServer')}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadServerData}
            loading={loading}
          >
            {t('aa.refreshData')}
          </Button>
          <Button
            danger
            onClick={handleClearData}
            disabled={importedData.length === 0}
          >
            {t('aa.clearData')}
          </Button>
        </Space>
      </div>

      {/* Data statistics */}
      <Card style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <Text strong>{t('aa.localData')}: </Text>
              <Text style={{ color: '#1890ff' }}>{importedData.length} {t('template.units.items')}</Text>
            </div>
            <div>
              <Text strong>{t('aa.serverData')}: </Text>
              <Text style={{ color: '#52c41a' }}>{serverData.length} {t('template.units.items')}</Text>
            </div>
            {statistics && (
              <>
                <div>
                  <Text strong>{t('aa.totalParticipants')}: </Text>
                  <Text style={{ color: '#fa8c16' }}>{statistics.totalParticipants}</Text>
                </div>
                <div>
                  <Text strong>{t('aa.dateRange')}: </Text>
                  <Text style={{ color: '#722ed1' }}>
                    {statistics.dateRange ? `${statistics.dateRange.start} ~ ${statistics.dateRange.end}` : t('template.noData')}
                  </Text>
                </div>
              </>
            )}
          </div>
          <div>
            <Text type="secondary">{t('aa.supportedJsonFormat')}</Text>
          </div>
        </div>
      </Card>

      {/* Data display area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Local imported data */}
        {importedData.length > 0 && (
          <Card title={t('aa.localData')} style={{ marginBottom: 16 }}>
            <pre style={{ 
              maxHeight: '200px', 
              overflow: 'auto', 
              backgroundColor: '#f5f5f5', 
              padding: '12px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {JSON.stringify(importedData, null, 2)}
            </pre>
          </Card>
        )}

        {/* Server data */}
        {serverData.length > 0 ? (
          <Card title={t('aa.serverData')}>
            <Table
              dataSource={serverData}
              rowKey="date"
              pagination={{ pageSize: 10 }}
              loading={loading}
              columns={[
                {
                  title: t('aa.date'),
                  dataIndex: 'date',
                  key: 'date',
                  render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
                  sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
                },
                {
                  title: t('gvg.eventType'),
                  dataIndex: 'event_type',
                  key: 'event_type',
                  render: (value: string) => <Text strong>{value || 'AA'}</Text>,
                },
                {
                  title: t('aa.participants'),
                  dataIndex: 'total_participants',
                  key: 'total_participants',
                  render: (value: number) => <Text strong style={{ color: '#52c41a' }}>
                    {value > 0 ? `${value}` : ''}
                  </Text>,
                },
                {
                  title: t('aa.nonParticipants'),
                  dataIndex: 'participants',
                  key: 'non_participants',
                  render: (participants: any[], _record: any) => {
                    const totalGuildMembers = guildMembers.length;
                    const participantCount = participants?.length || 0;
                    const nonParticipantCount = totalGuildMembers - participantCount;
                    return <Text strong style={{ color: '#ff4d4f' }}>
                      {nonParticipantCount > 0 ? `${nonParticipantCount}` : ''}
                    </Text>;
                  },
                },
                {
                  title: t('aa.actions'),
                  key: 'actions',
                  render: (_, record) => (
                    <Space>
                      <Button
                        size="small"
                        onClick={() => handleShowDetails(record)}
                      >
                        {t('aa.details')}
                      </Button>
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewImages(record.date)}
                        title="View images"
                      >
                        Images
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setImportedData([record]);
                          message.success(t('aa.loadedToEdit'));
                        }}
                      >
                        {t('aa.edit')}
                      </Button>
                      <Popconfirm
                        title={t('aa.confirmDelete')}
                        onConfirm={() => handleDeleteServerData(record.date)}
                        okText={t('common.confirm')}
                        cancelText={t('common.cancel')}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        >
                          {t('aa.delete')}
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        ) : importedData.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <p>{t('aa.noData')}</p>
              <p>{t('aa.noDataDescription')}</p>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Import data modal */}
      <Modal
        title={t('aa.importData')}
        open={isImportModalVisible}
        onCancel={() => {
          setIsImportModalVisible(false);
          setJsonText('');
        }}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              onClick={() => setImportType('file')}
              style={{ 
                backgroundColor: importType === 'file' ? '#1890ff' : '#f0f0f0',
                color: importType === 'file' ? 'white' : 'black',
                borderColor: importType === 'file' ? '#1890ff' : '#d9d9d9'
              }}
            >
              {t('aa.selectFile')}
            </Button>
            <Button
              onClick={() => setImportType('text')}
              style={{ 
                backgroundColor: importType === 'text' ? '#1890ff' : '#f0f0f0',
                color: importType === 'text' ? 'white' : 'black',
                borderColor: importType === 'text' ? '#1890ff' : '#d9d9d9'
              }}
            >
              {t('aa.pasteText')}
            </Button>
          </Space>
        </div>

        {importType === 'file' ? (
          <div>
            <Upload
              beforeUpload={handleFileUpload}
              accept=".json"
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} block>
                {t('aa.selectJsonFile')}
              </Button>
            </Upload>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {t('aa.supportedJsonFormat')}
            </Text>
          </div>
        ) : (
          <div>
            <TextArea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={t('aa.pasteJsonData')}
              rows={10}
              style={{ marginBottom: 16 }}
            />
            <Button
              onClick={handleTextImport}
              disabled={!jsonText.trim()}
              block
              style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
            >
              {t('aa.importData')}
            </Button>
          </div>
        )}
      </Modal>

      {/* Image recognition modal */}
      <EnhancedImageRecognition
        isOpen={isImageRecognitionVisible}
        onClose={() => setIsImageRecognitionVisible(false)}
        onSuccess={handleImageRecognitionSuccess}
        module="aa"
      />

      {/* Details modal */}
      <Modal
        title={`${t('aa.title')} ${t('aa.details')} - ${selectedRecord ? dayjs(selectedRecord.date).format('YYYY-MM-DD') : ''}`}
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedRecord(null);
        }}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        bodyStyle={{ height: '75vh', overflow: 'hidden' }}
      >
        {selectedRecord && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* AA activity information */}
            <Card size="small" style={{ marginBottom: 16, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '32px', justifyContent: 'space-around' }}>
                <div>
                  <Text strong>{t('gvg.eventType')}: </Text>
                  <Text style={{ fontSize: '16px' }}>AA</Text>
                </div>
                <div>
                  <Text strong>{t('aa.date')}: </Text>
                  {isDateEditing ? (
                    <DatePicker
                      value={dayjs(editingDate)}
                      onChange={(date) => {
                        if (date) {
                          setEditingDate(date.format('YYYY-MM-DD'));
                        }
                      }}
                      onBlur={() => setIsDateEditing(false)}
                      size="small"
                      style={{ fontSize: '16px' }}
                      autoFocus
                    />
                  ) : (
                    <Text 
                      style={{ 
                        fontSize: '16px', 
                        cursor: 'pointer'
                      }}
                      onClick={() => setIsDateEditing(true)}
                    >
                      {dayjs(editingDate).format('YYYY-MM-DD')}
                    </Text>
                  )}
                </div>
                <div>
                  <Text strong>{t('aa.participants')}: </Text>
                  <Text style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>{selectedRecord.total_participants} {t('template.units.people')}</Text>
                </div>
                <div>
                  <Text strong>{t('aa.nonParticipants')}: </Text>
                  <Text style={{ color: '#ff4d4f', fontSize: '16px', fontWeight: 'bold' }}>
                    {getUnparticipatedMembers().length} {t('template.units.people')}
                  </Text>
                </div>
              </div>
            </Card>

            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
              {/* Participant list */}
              <Card 
                title={`${t('aa.participants')} (${editingParticipants.length}${t('template.units.people')}) - ${t('aa.matchedCount')}: ${getMatchedGuildMembers().filter(p => p.matchedMember).length}${t('template.units.people')}`}
                size="small"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ flex: 1, padding: '12px', overflow: 'hidden' }}
              >
                <div style={{ height: '100%', overflow: 'auto' }}>
                  <Table
                    dataSource={getMatchedGuildMembers()}
                    rowKey={(record, index) => `${record.name}-${index}`}
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: t('aa.guildId'),
                        key: 'memberId',
                        width: 80,
                        render: (_, record) => (
                          <Text style={{ fontSize: '12px', color: record.matchedMember ? '#1890ff' : '#999' }}>
                            {record.matchedMember?.id || t('aa.unmatched')}
                          </Text>
                        )
                      },
                      {
                        title: t('aa.memberName'),
                        dataIndex: 'name',
                        key: 'name',
                        width: 150,
                        render: (name: string, record, index) => {
                          const isMatched = !!record.matchedMember;
                          const isEditing = editingCell === `name-${index}`;
                          const memberClass = record.matchedMember?.class;
                          
                          if (isEditing) {
                            return (
                              <Input
                                size="small"
                                defaultValue={name}
                                onBlur={(e) => {
                                  handleNameEdit(index, e.target.value);
                                  setEditingCell(null);
                                }}
                                onPressEnter={(e) => {
                                  handleNameEdit(index, (e.target as HTMLInputElement).value);
                                  setEditingCell(null);
                                }}
                                autoFocus
                              />
                            );
                          }
                          
                          return (
                            <div 
                              onClick={() => setEditingCell(`name-${index}`)}
                              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              {isMatched && memberClass && (
                                <img 
                                  src={`/images/classes/${memberClass}.webp`}
                                  alt={memberClass}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    objectFit: 'contain'
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              {isMatched ? (
                                <Text>{name}</Text>
                              ) : (
                                <Tag color="red" style={{ margin: 0 }}>
                                  {name} ({t('aa.unmatched')})
                                </Tag>
                              )}
                            </div>
                          );
                        }
                      },
                      {
                        title: t('common.class'),
                        key: 'memberClass',
                        width: 120,
                        render: (_, record) => {
                          const memberClass = record.matchedMember?.class;
                          const classColor = getClassColor(memberClass);
                          return memberClass ? (
                            <Tag 
                              style={{ 
                                backgroundColor: classColor,
                                color: '#000',
                                border: 'none',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                width: 'fit-content'
                              }}
                            >
                              <img 
                                src={`/images/classes/${memberClass}.webp`}
                                alt={memberClass}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  objectFit: 'contain'
                                }}
                                onError={(e) => {
                                  // If icon loading fails, hide image element
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {memberClass}
                            </Tag>
                          ) : (
                            <Text style={{ color: '#999' }}>{t('aa.unmatched')}</Text>
                          );
                        }
                      },
                    ]}
                  />
                </div>
              </Card>

              {/* Non-participant list */}
              <Card 
                title={`${t('aa.nonParticipants')} (${getUnparticipatedMembers().length}${t('template.units.people')})`}
                size="small"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ flex: 1, padding: '12px', overflow: 'hidden' }}
              >
                <div style={{ height: '100%', overflow: 'auto' }}>
                  <Table
                    dataSource={getUnparticipatedMembers()}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: t('aa.guildId'),
                        dataIndex: 'id',
                        key: 'id',
                        width: 80,
                        render: (id: number) => (
                          <Text style={{ fontSize: '12px', color: '#1890ff' }}>{id}</Text>
                        )
                      },
                      {
                        title: t('aa.memberName'),
                        dataIndex: 'name',
                        key: 'name',
                        width: 150,
                        render: (name: string, record, index) => {
                          const memberClass = record.class;
                          const isEditing = editingCell === `non-participant-name-${record.id}`;
                          
                          if (isEditing) {
                            return (
                              <Input
                                size="small"
                                defaultValue={name}
                                onBlur={(e) => {
                                  handleNonParticipantNameEdit(record.id, e.target.value);
                                  setEditingCell(null);
                                }}
                                onPressEnter={(e) => {
                                  handleNonParticipantNameEdit(record.id, (e.target as HTMLInputElement).value);
                                  setEditingCell(null);
                                }}
                                autoFocus
                              />
                            );
                          }
                          
                          return (
                            <div 
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                              onClick={() => setEditingCell(`non-participant-name-${record.id}`)}
                            >
                              {memberClass && (
                                <img 
                                  src={`/images/classes/${memberClass}.webp`}
                                  alt={memberClass}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    objectFit: 'contain'
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <Text strong>{name}</Text>
                            </div>
                          );
                        }
                      },
                      {
                        title: t('common.class'),
                        dataIndex: 'class',
                        key: 'class',
                        width: 120,
                        render: (className: string) => {
                          const classColor = getClassColor(className);
                          return className ? (
                            <Tag 
                              style={{ 
                                backgroundColor: classColor,
                                color: '#000',
                                border: 'none',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                width: 'fit-content'
                              }}
                            >
                              <img 
                                src={`/images/classes/${className}.webp`}
                                alt={className}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  objectFit: 'contain'
                                }}
                                onError={(e) => {
                                  // If icon loading fails, hide image element
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {className}
                            </Tag>
                          ) : (
                            <Text style={{ color: '#999' }}>-</Text>
                          );
                        }
                      },
                    ]}
                  />
                </div>
              </Card>
            </div>
          </div>
        )}
      </Modal>

      {/* AA image viewer */}
      <AAImageViewer
        visible={imageViewerVisible}
        onClose={() => setImageViewerVisible(false)}
        date={selectedImageDate}
      />
    </div>
  );
};

export default AAManager;