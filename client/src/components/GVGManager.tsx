import React, { useState, useEffect } from 'react';
import { Button, Upload, Modal, Input, message, Space, Card, Typography, Table, Popconfirm, Tag } from 'antd';
import { UploadOutlined, FileTextOutlined, CameraOutlined, ImportOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/es/upload';
import EnhancedImageRecognition from './EnhancedImageRecognition';
import GVGImageViewer from './GVGImageViewer';
import { gvgApi, guildMembersApi } from '../services/api';
import { GVGInfo } from '../types';
import dayjs from 'dayjs';
import DataManager from '../services/DataManager';
import { useTranslation } from '../hooks/useTranslation';
import { getClassColor } from '../utils/classColors';
import { classesApi } from '../services/api';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface GVGManagerProps {}

const GVGManager: React.FC<GVGManagerProps> = () => {
  const { t } = useTranslation();
  const [isImageRecognitionVisible, setIsImageRecognitionVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importType, setImportType] = useState<'file' | 'text'>('file');
  const [jsonText, setJsonText] = useState('');
  const [importedData, setImportedData] = useState<GVGInfo[]>([]);
  const [serverData, setServerData] = useState<GVGInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GVGInfo | null>(null);
  const [guildMembers, setGuildMembers] = useState<any[]>([]);
  const [editingParticipants, setEditingParticipants] = useState<any[]>([]);
  const [editingNonParticipants, setEditingNonParticipants] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [classes, setClasses] = useState<{id: string, name: string, color?: string}[]>([]);
  const [imageViewerVisible, setImageViewerVisible] = useState<boolean>(false);
  const [selectedImageDate, setSelectedImageDate] = useState<string>('');
  
  // Get DataManager instance
  const dataManager = DataManager.getInstance();

  // Load class configuration
  const loadClasses = async () => {
    try {
      const response = await classesApi.getAll();
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Failed to load class configuration:', error);
    }
  };

  // Load guild member data
  const loadGuildMembers = async () => {
    try {
      // First check if data already exists in DataManager
      const existingMembers = dataManager.getGuildMembers();
      if (existingMembers.length > 0) {
        console.log('Getting guild member data from DataManager, total', existingMembers.length, 'members');
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
        console.log('Loaded and saved guild member list to DataManager from API, total', members.length, 'members');
      } else {
        console.warn('Failed to get guild member data:', response.data.message);
      }
      
    } catch (error) {
      console.error('Failed to load guild members:', error);
      message.error(t('gvg.loadServerDataError'));
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
  const handleShowDetails = (record: GVGInfo) => {
    setSelectedRecord(record);
    setEditingParticipants([...(record.participants || [])]);
    setEditingNonParticipants([...(record.non_participants || [])]);
    setIsDetailModalVisible(true);
  };



  // Handle name editing - only modify non-participant names in GVG data, save directly after editing
  const handleNameEdit = async (_type: 'non_participants', index: number, newName: string) => {
    // Update local state
    const updated = [...editingNonParticipants];
    updated[index] = { ...updated[index], name: newName };
    setEditingNonParticipants(updated);
    
    // Save directly to server
    if (selectedRecord) {
      try {
        setLoading(true);
        
        // Build updated GVG data
        const updatedGVGData: GVGInfo = {
          ...selectedRecord,
          non_participants: updated
        };

        console.log('Auto-saving GVG changes:', updatedGVGData);
        const response = await gvgApi.importData([updatedGVGData]);
        
        if (response.data.success) {
          message.success('GVG data auto-saved successfully');
          // Reload server data
          await loadServerData();
          // Update selectedRecord to reflect latest data
          setSelectedRecord(updatedGVGData);
        } else {
          message.error(response.data.error || 'Auto-save failed');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        message.error('Auto-save failed, please try again');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle participant name editing
  const handleParticipantNameEdit = async (index: number, newName: string) => {
    const participants = getCalculatedParticipants();
    const participant = participants[index];
    if (participant?.matchedMember) {
      try {
        await dataManager.updateGuildMemberName(participant.matchedMember.id, newName);
        message.success('Member name updated successfully');
      } catch (error) {
        console.error('Failed to update member name:', error);
        message.error('Failed to update member name, please try again');
      }
    }
  };

  // Calculate participants - if editingParticipants is empty, exclude non-participants from guild members
  const getCalculatedParticipants = () => {
    if (editingParticipants.length > 0) {
      // If there's an explicit participant list, use it
      return editingParticipants.map(participant => ({
        ...participant,
        matchedMember: findGuildMemberByName(participant.name)
      }));
    } else {
      // Otherwise, calculate participants by excluding non-participants from guild members
      const nonParticipantNames = editingNonParticipants.map(p => p.name?.trim()).filter(Boolean);
      const calculatedParticipants = guildMembers
        .filter(member => {
          // Exclude members with empty names or in non-participant list
          if (!member.name?.trim() || nonParticipantNames.includes(member.name.trim())) {
            return false;
          }
          
          // If member has creation time and there's a selected GVG record, check if creation time is later than GVG time
          if (member.createdAt && selectedRecord?.date) {
            const memberCreatedDate = dayjs(member.createdAt).format('YYYY-MM-DD');
            const gvgDate = dayjs(selectedRecord.date).format('YYYY-MM-DD');
            
            // If member creation time is later than GVG time, exclude this member
            if (dayjs(memberCreatedDate).isAfter(dayjs(gvgDate))) {
              return false;
            }
          }
          
          return true;
        })
        .map(member => ({
          name: member.name,
          matchedMember: member
        }));
      return calculatedParticipants;
    }
  };

  // Calculate matched non-participants
  const getMatchedNonParticipants = () => {
    return editingNonParticipants.map(participant => ({
      ...participant,
      matchedMember: findGuildMemberByName(participant.name)
    }));
  };

  // Get participant count
  const getParticipantCount = () => {
    const calculated = getCalculatedParticipants();
    return calculated.length;
  };



  // Load server data
  const loadServerData = async () => {
    try {
      setLoading(true);
      const response = await gvgApi.getAllDates();
      if (response.data.success) {
        const dates = response.data.data;
        const allData: GVGInfo[] = [];
        
        for (const date of dates) {
          const dataResponse = await gvgApi.getByDate(date);
          if (dataResponse.data.success) {
            allData.push(dataResponse.data.data);
          }
        }
        
        setServerData(allData);
      } else {
        // Server returned failure, but might just be no data
        console.log('Server has no GVG data:', response.data.message);
        setServerData([]);
      }
      
      // Load statistics
      try {
        const statsResponse = await gvgApi.getStatistics();
        if (statsResponse.data.success) {
          setStatistics(statsResponse.data.data);
        }
      } catch (statsError) {
        // Statistics loading failure doesn't affect main functionality
        console.log('Statistics temporarily unavailable');
      }
    } catch (error: any) {
      // Check if it's 404 or 503 error (service endpoint doesn't exist)
      if (error.response?.status === 404 || error.response?.status === 503) {
        console.log('GVG service endpoint not yet implemented, this is normal');
        setServerData([]);
      } else {
        message.error(t('gvg.loadServerDataError'));
        console.error('Failed to load server data:', error);
      }
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
        setEditingNonParticipants([...editingNonParticipants]);
      }
    };

    // Add listener
    dataManager.addListener(handleDataChange);

    // Remove listener when component unmounts
    return () => {
      dataManager.removeListener(handleDataChange);
    };
  }, [dataManager, selectedRecord, editingParticipants, editingNonParticipants]);

  // Load data when component loads
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
        message.success(t('gvg.importSuccess'));
        setIsImportModalVisible(false);
      } catch (error) {
        message.error(t('gvg.jsonFormatError'));
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
      message.success(t('gvg.importSuccess'));
      setIsImportModalVisible(false);
      setJsonText('');
    } catch (error) {
      message.error(t('gvg.jsonFormatError'));
      console.error('Failed to parse JSON text:', error);
    }
  };

  // Handle image recognition success
  const handleImageRecognitionSuccess = (data: any[], module: string) => {
    if (module === 'gvg') {
      setImportedData(data);
      message.success(t('gvg.importSuccess'));
    }
  };

  // Save data to server
  const handleSaveToServer = async () => {
    if (importedData.length === 0) {
      message.warning(t('gvg.noDataToSave'));
      return;
    }

    try {
      setLoading(true);
      console.log('Preparing to save GVG data:', importedData);
      const response = await gvgApi.importData(importedData);
      console.log('Server response:', response.data);
      
      if (response.data.success) {
        message.success(response.data.message || t('gvg.saveSuccess'));
        setImportedData([]);
        // Reload server data
        await loadServerData();
      } else {
        console.error('Save failed, server response:', response.data);
        message.error(response.data.error || response.data.message || t('gvg.saveError'));
      }
    } catch (error) {
      console.error('Failed to save to server:', error);
      message.error(t('gvg.saveError'));
    } finally {
      setLoading(false);
    }
  };

  // Delete server data
  const handleDeleteServerData = async (date: string) => {
    try {
      const response = await gvgApi.deleteByDate(date);
      
      if (response.data.success) {
        message.success(response.data.message || t('gvg.deleteSuccess'));
        // Reload server data
        await loadServerData();
      } else {
        message.error(response.data.message || t('gvg.deleteError'));
      }
    } catch (error) {
      message.error(t('gvg.deleteError'));
      console.error('Failed to delete data:', error);
    }
  };

  // Clear data
  const handleClearData = () => {
    setImportedData([]);
    message.success(t('gvg.dataCleared'));
  };

  // View GVG images
  const handleViewImages = (date: string) => {
    setSelectedImageDate(date);
    setImageViewerVisible(true);
  };

  // Export data
  const handleExportData = () => {
    if (importedData.length === 0) {
      message.warning(t('gvg.noDataToExport'));
      return;
    }

    const dataStr = JSON.stringify(importedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gvg_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('Data exported successfully');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Action buttons area */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexShrink: 0 
      }}>
        <Title level={3} style={{ margin: 0 }}>{t('gvg.title')}</Title>
        <Space>
          <Button
            icon={<ImportOutlined />}
            onClick={() => setIsImportModalVisible(true)}
            style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
          >
            {t('gvg.importData')}
          </Button>
          <Button
            icon={<CameraOutlined />}
            onClick={() => setIsImageRecognitionVisible(true)}
            style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
          >
            {t('gvg.imageRecognition')}
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={handleExportData}
            disabled={importedData.length === 0}
          >
            {t('gvg.exportData')}
          </Button>
          <Button
            type="primary"
            onClick={handleSaveToServer}
            disabled={importedData.length === 0}
            loading={loading}
          >
            {t('gvg.saveToServer')}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadServerData}
            loading={loading}
          >
            {t('gvg.refreshData')}
          </Button>
          <Button
            danger
            onClick={handleClearData}
            disabled={importedData.length === 0}
          >
            {t('gvg.clearData')}
          </Button>
        </Space>
      </div>

      {/* Data statistics */}
      <Card style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <Text strong>{t('gvg.localData')}: </Text>
              <Text style={{ color: '#1890ff' }}>{importedData.length} {t('template.units.items')}</Text>
            </div>
            <div>
              <Text strong>{t('gvg.serverData')}: </Text>
              <Text style={{ color: '#52c41a' }}>{serverData.length} {t('template.units.items')}</Text>
            </div>
            {statistics && (
              <>
                <div>
                  <Text strong>{t('gvg.totalRecords')}: </Text>
                  <Text style={{ color: '#fa8c16' }}>{statistics.totalRecords} {t('template.units.items')}</Text>
                </div>
                <div>
                  <Text strong>{t('gvg.dateRange')}: </Text>
                  <Text style={{ color: '#722ed1' }}>
                    {statistics.dateRange ? `${statistics.dateRange.start} ~ ${statistics.dateRange.end}` : t('template.noData')}
                  </Text>
                </div>
              </>
            )}
          </div>
          <div>
            <Text type="secondary">{t('gvg.supportedJsonAndImageFormat')}</Text>
          </div>
        </div>
      </Card>

      {/* Data display area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Local imported data */}
        {importedData.length > 0 && (
          <Card title={t('gvg.localData')} style={{ marginBottom: 16 }}>
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
          <Card title={t('gvg.serverData')}>
            <Table
              dataSource={serverData}
              rowKey="date"
              pagination={{ pageSize: 10 }}
              loading={loading}
              columns={[
                {
                  title: t('gvg.date'),
                  dataIndex: 'date',
                  key: 'date',
                  render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
                  sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
                },
                {
                  title: t('gvg.eventType'),
                  dataIndex: 'event_type',
                  key: 'event_type',
                  render: (value: string) => <Text strong>{value}</Text>,
                },
                {
                  title: t('gvg.participants'),
                  key: 'participants_count',
                  render: (_, record) => {
                    // If there's an explicit participant list, use it; otherwise calculate participant count
                    let count = 0;
                    if (record.participants && record.participants.length > 0) {
                      count = record.participants.length;
                    } else {
                      // Calculate participant count = total guild members - non-participant count
                      const nonParticipantCount = record.non_participants?.length || 0;
                      count = Math.max(0, guildMembers.length - nonParticipantCount);
                    }
                    return <Text strong style={{ color: '#52c41a' }}>
                      {count > 0 ? `${count}` : ''}
                    </Text>;
                  },
                },
                {
                  title: t('gvg.nonParticipants'),
                  dataIndex: 'non_participants',
                  key: 'non_participants_count',
                  render: (nonParticipants: any[]) => {
                    const count = nonParticipants?.length || 0;
                    return <Text strong style={{ color: '#ff4d4f' }}>
                      {count > 0 ? `${count}` : ''}
                    </Text>;
                  },
                },
                {
                  title: t('gvg.actions'),
                  key: 'actions',
                  render: (_, record) => (
                    <Space>
                      <Button
                        size="small"
                        onClick={() => handleShowDetails(record)}
                      >
                        {t('gvg.details')}
                      </Button>
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewImages(record.date)}
                        title="View Images"
                      >
                        Images
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setImportedData([record]);
                          message.success(t('gvg.loadedToEdit'));
                        }}
                      >
                        {t('gvg.edit')}
                      </Button>
                      <Popconfirm
                        title={t('gvg.confirmDelete')}
                        onConfirm={() => handleDeleteServerData(record.date)}
                        okText={t('common.confirm')}
                        cancelText={t('common.cancel')}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        >
                          {t('gvg.delete')}
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
              <p>{t('gvg.noData')}</p>
              <p>{t('gvg.noDataDescription')}</p>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Import data modal */}
      <Modal
        title={t('gvg.importData')}
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
              {t('gvg.selectFile')}
            </Button>
            <Button
              onClick={() => setImportType('text')}
              style={{ 
                backgroundColor: importType === 'text' ? '#1890ff' : '#f0f0f0',
                color: importType === 'text' ? 'white' : 'black',
                borderColor: importType === 'text' ? '#1890ff' : '#d9d9d9'
              }}
            >
              {t('gvg.pasteText')}
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
                {t('gvg.selectJsonFile')}
              </Button>
            </Upload>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {t('gvg.supportedJsonFormat')}
            </Text>
          </div>
        ) : (
          <div>
            <TextArea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={t('gvg.pasteJsonData')}
              rows={10}
              style={{ marginBottom: 16 }}
            />
            <Button
              onClick={handleTextImport}
              disabled={!jsonText.trim()}
              block
              style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
            >
              {t('gvg.importData')}
            </Button>
          </div>
        )}
      </Modal>

      {/* Image recognition modal */}
      <EnhancedImageRecognition
        isOpen={isImageRecognitionVisible}
        onClose={() => setIsImageRecognitionVisible(false)}
        onSuccess={handleImageRecognitionSuccess}
        module="gvg"
      />

      {/* Details modal */}
      <Modal
        title={`${t('gvg.title')} ${t('gvg.details')} - ${selectedRecord ? dayjs(selectedRecord.date).format('YYYY-MM-DD') : ''}`}
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
            {/* GVG Event Information */}
            <Card size="small" style={{ marginBottom: 16, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '32px', justifyContent: 'space-around' }}>
                <div>
                  <Text strong>{t('gvg.eventType')}: </Text>
                  <Text style={{ fontSize: '16px' }}>{selectedRecord.event_type}</Text>
                </div>
                <div>
                  <Text strong>{t('gvg.date')}: </Text>
                  <Text style={{ fontSize: '16px' }}>{dayjs(selectedRecord.date).format('YYYY-MM-DD')}</Text>
                </div>
                <div>
                  <Text strong>{t('gvg.participants')}: </Text>
                  <Text style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>
                    {getParticipantCount() > 0 ? `${getParticipantCount()} ${t('template.units.people')}` : ''}
                  </Text>
                </div>
                <div>
                  <Text strong>{t('gvg.nonParticipants')}: </Text>
                  <Text style={{ color: '#ff4d4f', fontSize: '16px', fontWeight: 'bold' }}>
                    {editingNonParticipants.length > 0 ? `${editingNonParticipants.length} ${t('template.units.people')}` : ''}
                  </Text>
                </div>
              </div>
            </Card>

            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
              {/* Participant List */}
              <Card 
                title={`${t('gvg.participants')} (${getParticipantCount()}${t('template.units.people')}) - ${t('gvg.readonly')}`}
                size="small"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ flex: 1, padding: '12px', overflow: 'hidden' }}
              >
                <div style={{ height: '100%', overflow: 'auto' }}>
                  <Table
                    dataSource={getCalculatedParticipants()}
                    rowKey={(record, index) => `${record.name}-${index}`}
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: t('gvg.guildId'),
                        key: 'memberId',
                        width: 80,
                        render: (_, record) => (
                          <Text style={{ fontSize: '12px', color: record.matchedMember ? '#1890ff' : '#999' }}>
                            {record.matchedMember?.id || t('gvg.unmatched')}
                          </Text>
                        )
                      },
                      {
                        title: t('gvg.memberName'),
                        dataIndex: 'name',
                        key: 'name',
                        width: 150,
                        render: (name: string, record, index) => {
                          const isMatched = !!record.matchedMember;
                          const isEditing = editingCell === `participants-name-${index}`;
                          
                          if (isEditing) {
                            return (
                              <Input
                                size="small"
                                defaultValue={name}
                                onBlur={(e) => {
                                  handleParticipantNameEdit(index, e.target.value);
                                  setEditingCell(null);
                                }}
                                onPressEnter={(e) => {
                                  handleParticipantNameEdit(index, (e.target as HTMLInputElement).value);
                                  setEditingCell(null);
                                }}
                                autoFocus
                              />
                            );
                          }
                          
                          return (
                            <div 
                              onClick={() => setEditingCell(`participants-name-${index}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              {isMatched ? (
                                <Text>{name}</Text>
                              ) : (
                                <Tag color="red" style={{ margin: 0 }}>
                                  {name} ({t('gvg.unmatched')})
                                </Tag>
                              )}
                            </div>
                          );
                        }
                      },
                      {
                        title: t('gvg.class'),
                        key: 'memberClass',
                        width: 120,
                        render: (_, record) => {
                          const memberClass = record.matchedMember?.class;
                          const classColor = getClassColor(memberClass, classes);
                          
                          if (!memberClass) {
                            return <Text style={{ color: '#999' }}>{t('gvg.unmatched')}</Text>;
                          }
                          
                          return (
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
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {memberClass}
                            </Tag>
                          );
                        }
                      },
                    ]}
                  />
                </div>
              </Card>

              {/* Non-participant List */}
              <Card 
                title={`${t('gvg.nonParticipants')} (${editingNonParticipants.length}${t('template.units.people')}) - ${t('gvg.matchedCount')}: ${getMatchedNonParticipants().filter(p => p.matchedMember).length}${t('template.units.people')}`}
                size="small"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ flex: 1, padding: '12px', overflow: 'hidden' }}
              >
                <div style={{ height: '100%', overflow: 'auto' }}>
                  <Table
                    dataSource={getMatchedNonParticipants()}
                    rowKey={(record, index) => `${record.name}-${index}`}
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: t('gvg.guildId'),
                        key: 'memberId',
                        width: 80,
                        render: (_, record) => (
                          <Text style={{ fontSize: '12px', color: record.matchedMember ? '#1890ff' : '#999' }}>
                            {record.matchedMember?.id || t('gvg.unmatched')}
                          </Text>
                        )
                      },
                      {
                        title: t('gvg.memberName'),
                        dataIndex: 'name',
                        key: 'name',
                        width: 150,
                        render: (name: string, record, index) => {
                          const isMatched = !!record.matchedMember;
                          const isEditing = editingCell === `non_participants-name-${index}`;
                          
                          if (isEditing) {
                            return (
                              <Input
                                size="small"
                                defaultValue={name}
                                onBlur={(e) => {
                                  handleNameEdit('non_participants', index, e.target.value);
                                  setEditingCell(null);
                                }}
                                onPressEnter={(e) => {
                                  handleNameEdit('non_participants', index, (e.target as HTMLInputElement).value);
                                  setEditingCell(null);
                                }}
                                autoFocus
                              />
                            );
                          }
                          
                          return (
                            <div 
                              onClick={() => setEditingCell(`non_participants-name-${index}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              {isMatched ? (
                                <Text>{name}</Text>
                              ) : (
                                <Tag color="red" style={{ margin: 0 }}>
                                  {name} ({t('gvg.unmatched')})
                                </Tag>
                              )}
                            </div>
                          );
                        }
                      },
                      {
                        title: t('gvg.class'),
                        key: 'memberClass',
                        width: 120,
                        render: (_, record) => {
                          const memberClass = record.matchedMember?.class;
                          const classColor = getClassColor(memberClass, classes);
                          
                          if (!memberClass) {
                            return <Text style={{ color: '#999' }}>{t('gvg.unmatched')}</Text>;
                          }
                          
                          return (
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
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {memberClass}
                            </Tag>
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

      {/* GVG Image Viewer */}
      <GVGImageViewer
        visible={imageViewerVisible}
        onClose={() => setImageViewerVisible(false)}
        date={selectedImageDate}
      />
    </div>
  );
};

export default GVGManager;