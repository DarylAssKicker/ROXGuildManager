import React, { useState, useEffect } from 'react';
import { Button, Upload, Modal, Input, message, Space, Card, Typography, Table, Popconfirm, Tag } from 'antd';
import { UploadOutlined, FileTextOutlined, CameraOutlined, ImportOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/es/upload';
import EnhancedImageRecognition from './EnhancedImageRecognition';
import KVMImageViewer from './KVMImageViewer';
import { kvmApi, guildMembersApi, classesApi } from '../services/api';
import { KVMInfo } from '../types';
import dayjs from 'dayjs';
import DataManager from '../services/DataManager';
import { useTranslation } from '../hooks/useTranslation';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface KVMManagerProps {}

const KVMManager: React.FC<KVMManagerProps> = () => {
  const { t } = useTranslation();
  const [isImageRecognitionVisible, setIsImageRecognitionVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importType, setImportType] = useState<'file' | 'text'>('file');
  const [jsonText, setJsonText] = useState('');
  const [importedData, setImportedData] = useState<KVMInfo[]>([]);
  const [serverData, setServerData] = useState<KVMInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<KVMInfo | null>(null);
  // const [guildMembers, setGuildMembers] = useState<any[]>([]);
  const [editingNonParticipants, setEditingNonParticipants] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [classes, setClasses] = useState<{id: string, name: string, color?: string}[]>([]);
  const [imageViewerVisible, setImageViewerVisible] = useState<boolean>(false);
  const [selectedImageDate, setSelectedImageDate] = useState<string>('');
  
  // Get DataManager instance
  const dataManager = DataManager.getInstance();

  // Load class data
  const loadClasses = async () => {
    try {
      const response = await classesApi.getAll();
      if (response.data.success && response.data.data) {
        setClasses(response.data.data);
        console.log('Successfully loaded class list, total', response.data.data.length, 'classes');
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  };

  // Get color by class name
  const getClassColor = (className: string) => {
    const classInfo = classes.find(c => c.name === className);
    const color = classInfo?.color || '#f0f0f0'; // Default light gray
    // Convert color to lighter background color
    return color + '40'; // Add transparency
  };

  // Load guild member data
  const loadGuildMembers = async () => {
    try {
      // First check if DataManager already has data
      const existingMembers = dataManager.getGuildMembers();
      if (existingMembers.length > 0) {
        console.log('Get guild member data from DataManager, total', existingMembers.length, 'members');
        // setGuildMembers(existingMembers);
        return;
      }

      // Get guild member data from API
      console.log('Getting guild member data from API...');
      const response = await guildMembersApi.getAll();
      
      if (response.data.success && response.data.data) {
        const members = response.data.data;
        // Save to DataManager
        dataManager.setGuildMembers(members);
        // setGuildMembers(members);
        console.log('Loaded and saved guild member list from API to DataManager, total', members.length, 'members');
      } else {
        console.warn('Failed to get guild member data:', response.data.message);
      }
      
    } catch (error) {
      console.error('Failed to load guild members:', error);
      message.error(t('kvm.loadServerDataError'));
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
  const handleShowDetails = (record: KVMInfo) => {
    setSelectedRecord(record);
    setEditingNonParticipants([...(record.non_participants || [])]);
    setIsDetailModalVisible(true);
  };



  // Handle name editing - only modify non-participant names in KVM data, save directly after editing
  const handleNameEdit = async (index: number, newName: string) => {
    // Update local state
    const updated = [...editingNonParticipants];
    updated[index] = { ...updated[index], name: newName };
    setEditingNonParticipants(updated);
    
    // Save directly to server
    if (selectedRecord) {
      try {
        setLoading(true);
        
        // Build updated KVM data
        const updatedKVMData: KVMInfo = {
          ...selectedRecord,
          non_participants: updated
        };

        console.log('Auto-saving KVM changes:', updatedKVMData);
        const response = await kvmApi.importData([updatedKVMData]);
        
        if (response.data.success) {
          message.success('KVM data auto-saved successfully');
          // Reload server data
          await loadServerData();
          // Update selectedRecord to reflect latest data
          setSelectedRecord(updatedKVMData);
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
    const participants = getParticipants();
    const participant = participants[index];
    if (participant) {
      try {
        // Update guild member data directly
        await dataManager.updateGuildMemberName(participant.id, newName);
        message.success('Member name updated successfully');
      } catch (error) {
        console.error('Failed to update member name:', error);
        message.error('Failed to update member name, please try again');
      }
    }
  };

  // Calculate matched non-participants
  const getMatchedNonParticipants = () => {
    return editingNonParticipants.map(participant => ({
      ...participant,
      matchedMember: findGuildMemberByName(participant.name)
    }));
  };

  // Calculate participant list (exclude non-participants from guild members)
  const getParticipants = () => {
    const allMembers = dataManager.getGuildMembers();
    const nonParticipantNames = editingNonParticipants.map(p => p.name?.trim()).filter(Boolean);
    
    return allMembers.filter(member => {
      // Exclude members in the non-participant list
      if (nonParticipantNames.includes(member.name?.trim())) {
        return false;
      }
      
      // If member has creation time and there's a selected KVM record, check if creation time is later than KVM time
      if (member.createdAt && selectedRecord?.date) {
        const memberCreatedDate = dayjs(member.createdAt).format('YYYY-MM-DD');
        const kvmDate = dayjs(selectedRecord.date).format('YYYY-MM-DD');
        
        // If member creation time is later than KVM time, exclude the member
        if (dayjs(memberCreatedDate).isAfter(dayjs(kvmDate))) {
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
      const response = await kvmApi.getAllDates();
      if (response.data.success) {
        const dates = response.data.data;
        const allData: KVMInfo[] = [];
        
        for (const date of dates) {
          const dataResponse = await kvmApi.getByDate(date);
          if (dataResponse.data.success) {
            allData.push(dataResponse.data.data);
          }
        }
        
        setServerData(allData);
      } else {
        // Server returned failure, but it might just be no data
        console.log('Server has no KVM data:', response.data.message);
        setServerData([]);
      }
      
      // Load statistics
      try {
        const statsResponse = await kvmApi.getStatistics();
        if (statsResponse.data.success) {
          setStatistics(statsResponse.data.data);
        }
      } catch (statsError) {
        // Statistics loading failure doesn't affect main functionality
        console.log('Statistics temporarily unavailable');
      }
    } catch (error: any) {
      // Check if it's a 404 or 503 error (service endpoint doesn't exist)
      if (error.response?.status === 404 || error.response?.status === 503) {
        console.log('KVM service endpoint not yet implemented, this is normal');
        setServerData([]);
      } else {
        message.error(t('kvm.loadServerDataError'));
        console.error('Failed to load server data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Listen for guild member data changes in DataManager
  useEffect(() => {
    const handleDataChange = () => {
      // Force re-render to update matching effects
      if (selectedRecord) {
        setEditingNonParticipants([...editingNonParticipants]);
      }
    };

    // Add listener
    dataManager.addListener(handleDataChange);

    // Remove listener when component unmounts
    return () => {
      dataManager.removeListener(handleDataChange);
    };
  }, [dataManager, selectedRecord, editingNonParticipants]);

  // Load data when component mounts
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
        message.success(t('kvm.importSuccess'));
        setIsImportModalVisible(false);
      } catch (error) {
        message.error(t('kvm.jsonFormatError'));
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
      message.success(t('kvm.importSuccess'));
      setIsImportModalVisible(false);
      setJsonText('');
    } catch (error) {
      message.error(t('kvm.jsonFormatError'));
      console.error('Failed to parse JSON text:', error);
    }
  };

  // Handle image recognition success
  const handleImageRecognitionSuccess = (data: any[], module: string) => {
    if (module === 'kvm') {
      setImportedData(data);
      message.success(t('kvm.importSuccess'));
    }
  };

  // Save data to server
  const handleSaveToServer = async () => {
    if (importedData.length === 0) {
      message.warning(t('kvm.noDataToSave'));
      return;
    }

    try {
      setLoading(true);
      console.log('Preparing to save KVM data:', importedData);
      const response = await kvmApi.importData(importedData);
      console.log('Server response:', response.data);
      
      if (response.data.success) {
        message.success(response.data.message || t('kvm.saveSuccess'));
        setImportedData([]);
        // Reload server data
        await loadServerData();
      } else {
        console.error('Save failed, server response:', response.data);
        message.error(response.data.error || response.data.message || t('kvm.saveError'));
      }
    } catch (error) {
      console.error('Failed to save to server:', error);
      message.error(t('kvm.saveError'));
    } finally {
      setLoading(false);
    }
  };

  // Delete server data
  const handleDeleteServerData = async (date: string) => {
    try {
      const response = await kvmApi.deleteByDate(date);
      
      if (response.data.success) {
        message.success(response.data.message || t('kvm.deleteSuccess'));
        // Reload server data
        await loadServerData();
      } else {
        message.error(response.data.message || t('kvm.deleteError'));
      }
    } catch (error) {
      message.error(t('kvm.deleteError'));
      console.error('Failed to delete data:', error);
    }
  };

  // Clear data
  const handleClearData = () => {
    setImportedData([]);
    message.success(t('kvm.dataCleared'));
  };

  // View KVM images
  const handleViewImages = (date: string) => {
    setSelectedImageDate(date);
    setImageViewerVisible(true);
  };

  // Export data
  const handleExportData = () => {
    if (importedData.length === 0) {
      message.warning(t('kvm.noDataToExport'));
      return;
    }

    const dataStr = JSON.stringify(importedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kvm_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('Data exported successfully');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Operation buttons area */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexShrink: 0 
      }}>
        <Title level={3} style={{ margin: 0 }}>{t('kvm.title')}</Title>
        <Space>
          <Button
            icon={<ImportOutlined />}
            onClick={() => setIsImportModalVisible(true)}
            style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
          >
            {t('kvm.importData')}
          </Button>
          <Button
            icon={<CameraOutlined />}
            onClick={() => setIsImageRecognitionVisible(true)}
            style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
          >
            {t('kvm.imageRecognition')}
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={handleExportData}
            disabled={importedData.length === 0}
          >
            {t('kvm.exportData')}
          </Button>
          <Button
            type="primary"
            onClick={handleSaveToServer}
            disabled={importedData.length === 0}
            loading={loading}
          >
            {t('kvm.saveToServer')}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadServerData}
            loading={loading}
          >
            {t('kvm.refreshData')}
          </Button>
          <Button
            danger
            onClick={handleClearData}
            disabled={importedData.length === 0}
          >
            {t('kvm.clearData')}
          </Button>
        </Space>
      </div>

      {/* Data statistics */}
      <Card style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <Text strong>{t('kvm.localData')}: </Text>
              <Text style={{ color: '#1890ff' }}>{importedData.length} {t('template.units.items')}</Text>
            </div>
            <div>
              <Text strong>{t('kvm.serverData')}: </Text>
              <Text style={{ color: '#52c41a' }}>{serverData.length} {t('template.units.items')}</Text>
            </div>
            {statistics && (
              <>
                <div>
                  <Text strong>{t('kvm.totalRecords')}: </Text>
                  <Text style={{ color: '#fa8c16' }}>{statistics.totalRecords} {t('template.units.items')}</Text>
                </div>
                <div>
                  <Text strong>{t('kvm.totalParticipants')}: </Text>
                  <Text style={{ color: '#52c41a' }}>{statistics.totalParticipants} {t('template.units.personTimes')}</Text>
                </div>
                <div>
                  <Text strong>{t('kvm.averageParticipants')}: </Text>
                  <Text style={{ color: '#722ed1' }}>{statistics.averageParticipants} {t('template.units.people')}</Text>
                </div>
                <div>
                  <Text strong>{t('kvm.dateRange')}: </Text>
                  <Text style={{ color: '#722ed1' }}>
                    {statistics.dateRange ? `${statistics.dateRange.start} ~ ${statistics.dateRange.end}` : t('template.noData')}
                  </Text>
                </div>
              </>
            )}
          </div>
          <div>
            <Text type="secondary">{t('kvm.supportedJsonAndImageFormat')}</Text>
          </div>
        </div>
      </Card>

      {/* Data display area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Local imported data */}
        {importedData.length > 0 && (
          <Card title={t('kvm.localData')} style={{ marginBottom: 16 }}>
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
          <Card title={t('kvm.serverData')}>
            <Table
              dataSource={serverData}
              rowKey="date"
              pagination={{ pageSize: 10 }}
              loading={loading}
              columns={[
                {
                  title: t('kvm.date'),
                  dataIndex: 'date',
                  key: 'date',
                  render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
                  sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
                },
                {
                  title: t('kvm.event_type'),
                  dataIndex: 'event_type',
                  key: 'event_type',
                  render: (value: string) => <Text strong>{value}</Text>,
                },
                {
                  title: t('kvm.totalParticipants'),
                  dataIndex: 'total_participants',
                  key: 'total_participants',
                  render: (count: number) => (
                    <Text strong style={{ color: '#52c41a' }}>
                      {count > 0 ? `${count}` : ''}
                    </Text>
                  ),
                },
                {
                  title: t('kvm.nonParticipants'),
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
                  title: t('kvm.actions'),
                  key: 'actions',
                  render: (_, record) => (
                    <Space>
                      <Button
                        size="small"
                        onClick={() => handleShowDetails(record)}
                      >
                        {t('kvm.details')}
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
                          message.success(t('kvm.loadedToEdit'));
                        }}
                      >
                        {t('kvm.edit')}
                      </Button>
                      <Popconfirm
                        title={t('kvm.confirmDelete')}
                        onConfirm={() => handleDeleteServerData(record.date)}
                        okText={t('common.confirm')}
                        cancelText={t('common.cancel')}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        >
                          {t('kvm.delete')}
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
              <p>{t('kvm.noData')}</p>
              <p>{t('kvm.noDataDescription')}</p>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Import data modal */}
      <Modal
        title={t('kvm.importData')}
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
              {t('kvm.selectFile')}
            </Button>
            <Button
              onClick={() => setImportType('text')}
              style={{ 
                backgroundColor: importType === 'text' ? '#1890ff' : '#f0f0f0',
                color: importType === 'text' ? 'white' : 'black',
                borderColor: importType === 'text' ? '#1890ff' : '#d9d9d9'
              }}
            >
              {t('kvm.pasteText')}
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
                {t('kvm.selectJsonFile')}
              </Button>
            </Upload>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {t('kvm.supportedJsonFormat')}
            </Text>
          </div>
        ) : (
          <div>
            <TextArea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={t('kvm.pasteJsonData')}
              rows={10}
              style={{ marginBottom: 16 }}
            />
            <Button
              onClick={handleTextImport}
              disabled={!jsonText.trim()}
              block
              style={{ backgroundColor: '#1890ff', color: 'white', borderColor: '#1890ff' }}
            >
              {t('kvm.importData')}
            </Button>
          </div>
        )}
      </Modal>

      {/* Image recognition modal */}
      <EnhancedImageRecognition
        isOpen={isImageRecognitionVisible}
        onClose={() => setIsImageRecognitionVisible(false)}
        onSuccess={handleImageRecognitionSuccess}
        module="kvm"
      />

      {/* Details modal */}
      <Modal
        title={`${t('kvm.title')} ${t('kvm.details')} - ${selectedRecord ? dayjs(selectedRecord.date).format('YYYY-MM-DD') : ''}`}
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedRecord(null);
        }}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        styles={{ body: { height: '80vh', overflow: 'hidden' } }}
      >
        {selectedRecord && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* KVM activity information */}
            <Card size="small" style={{ marginBottom: 16, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '32px', justifyContent: 'space-around' }}>
                <div>
                  <Text strong>{t('gvg.eventType')}: </Text>
                  <Text style={{ fontSize: '16px' }}>{selectedRecord.event_type || 'KVM'}</Text>
                </div>
                <div>
                  <Text strong>{t('kvm.date')}: </Text>
                  <Text style={{ fontSize: '16px' }}>{dayjs(selectedRecord.date).format('YYYY-MM-DD')}</Text>
                </div>
                <div>
                  <Text strong>{t('kvm.totalParticipants')}: </Text>
                  <Text style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>
                    {getParticipants().length} {t('template.units.people')}
                  </Text>
                </div>
                <div>
                  <Text strong>{t('kvm.nonParticipants')}: </Text>
                  <Text style={{ color: '#ff4d4f', fontSize: '16px', fontWeight: 'bold' }}>
                    {editingNonParticipants.length} {t('template.units.people')}
                  </Text>
                </div>
              </div>
            </Card>

            <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
              {/* Participants list */}
              <Card 
                title={`${t('kvm.participants')} (${getParticipants().length}${t('template.units.people')})`}
                size="small"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, padding: '12px', overflow: 'hidden' } }}
              >
                <div style={{ height: '100%', overflow: 'auto' }}>
                  <Table
                    dataSource={getParticipants()}
                    rowKey={(record) => record.id}
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: t('kvm.guildId'),
                        dataIndex: 'id',
                        key: 'id',
                        width: 80,
                        render: (id: string) => (
                          <Text style={{ fontSize: '12px', color: '#1890ff' }}>{id}</Text>
                        )
                      },
                      {
                        title: t('kvm.memberName'),
                        dataIndex: 'name',
                        key: 'name',
                        width: 150,
                        render: (name: string, record, index) => {
                          const isEditing = editingCell === `participants-name-${index}`;
                          const memberClass = record.class;
                          
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
                              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
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
                              <Text>{name}</Text>
                            </div>
                          );
                        }
                      },
                      {
                        title: t('common.class'),
                        dataIndex: 'class',
                        key: 'class',
                        width: 120,
                        render: (memberClass: string) => {
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
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {memberClass}
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

              {/* Non-participants list */}
              <Card 
                title={`${t('kvm.nonParticipants')} (${editingNonParticipants.length}${t('template.units.people')}) - ${t('kvm.matchedCount')}: ${getMatchedNonParticipants().filter(p => p.matchedMember).length}${t('template.units.people')}`}
                size="small"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, padding: '12px', overflow: 'hidden' } }}
              >
                <div style={{ height: '100%', overflow: 'auto' }}>
                  <Table
                    dataSource={getMatchedNonParticipants()}
                    rowKey={(record, index) => `${record.name}-${index}`}
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: t('kvm.guildId'),
                        key: 'memberId',
                        width: 80,
                        render: (_, record) => (
                          <Text style={{ fontSize: '12px', color: record.matchedMember ? '#1890ff' : '#999' }}>
                            {record.matchedMember?.id || t('kvm.unmatched')}
                          </Text>
                        )
                      },
                      {
                        title: t('kvm.memberName'),
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
                              onClick={() => setEditingCell(`non_participants-name-${index}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              {isMatched ? (
                                <Text>{name}</Text>
                              ) : (
                                <Tag color="red" style={{ margin: 0 }}>
                                  {name} ({t('kvm.unmatched')})
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
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {memberClass}
                            </Tag>
                          ) : (
                            <Text style={{ color: '#999' }}>{t('kvm.unmatched')}</Text>
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

      {/* KVM image viewer */}
      <KVMImageViewer
        visible={imageViewerVisible}
        onClose={() => setImageViewerVisible(false)}
        date={selectedImageDate}
      />
    </div>
  );
};

export default KVMManager;