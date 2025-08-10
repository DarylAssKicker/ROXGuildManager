import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Checkbox, Button, Table, Typography, Space, Spin, message, Modal, Tag } from 'antd';
import { BarChartOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { kvmApi, aaApi, gvgApi, guildMembersApi, classesApi } from '../services/api';
import { KVMInfo, AAInfo, GVGInfo } from '../types';
import DataManager from '../services/DataManager';
import { useTranslation } from '../hooks/useTranslation';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface AnalysisResult {
  memberId: number;
  memberName: string;
  class: string;
  createAt?: string;
  kvmAbsentCount?: number;
  aaAbsentCount: number;
  gvgAbsentCount: number;
  kvmDetails?: { date: string; status: 'absent' | 'present' }[];
  aaDetails?: { date: string; status: 'absent' | 'present' }[];
  gvgDetails?: { date: string; status: 'absent' | 'present' }[];
}

interface DataAnalysisProps {}

const DataAnalysis: React.FC<DataAnalysisProps> = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [includeKVM, setIncludeKVM] = useState(true);
  const [includeAA, setIncludeAA] = useState(true);
  const [includeGVG, setIncludeGVG] = useState(true);
  const [loading, setLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [guildMembers, setGuildMembers] = useState<any[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMemberDetails, setSelectedMemberDetails] = useState<AnalysisResult | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

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
      message.error('Failed to load guild member data, please check server connection');
    }
  };

  // Listen to guild member data changes in DataManager
  useEffect(() => {
    const handleDataChange = () => {
      const members = dataManager.getGuildMembers();
      setGuildMembers(members);
    };

    // Add listener
    dataManager.addListener(handleDataChange);

    // Remove listener when component unmounts
    return () => {
      dataManager.removeListener(handleDataChange);
    };
  }, [dataManager]);

  // Load guild member data and class configuration when component loads
  useEffect(() => {
    loadGuildMembers();
    loadClasses();
  }, []);

  // Perform data analysis
  const performAnalysis = async () => {
    if (!dateRange) {
      message.warning(t('dataAnalysis.selectDateRange'));
      return;
    }

    if (!includeKVM && !includeAA && !includeGVG) {
      message.warning(t('dataAnalysis.selectActivityType'));
      return;
    }

    if (guildMembers.length === 0) {
      message.warning(t('dataAnalysis.guildMemberDataNotLoaded'));
      return;
    }

    setLoading(true);
    
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      let kvmData: KVMInfo[] = [];
      let aaData: AAInfo[] = [];
      let gvgData: GVGInfo[] = [];

      // Get KVM data
      if (includeKVM) {
        try {
          const kvmResponse = await kvmApi.getByDateRange(startDate, endDate);
          if (kvmResponse.data.success) {
            kvmData = kvmResponse.data.data || [];
          }
        } catch (error) {
          console.log('Failed to get KVM data, service endpoint may not exist');
        }
      }

      // Get AA data
      if (includeAA) {
        try {
          const aaResponse = await aaApi.getByDateRange(startDate, endDate);
          if (aaResponse.data.success) {
            aaData = aaResponse.data.data || [];
          }
        } catch (error) {
          console.log('Failed to get AA data, service endpoint may not exist');
        }
      }

      // Get GVG data
      if (includeGVG) {
        try {
          const gvgResponse = await gvgApi.getByDateRange(startDate, endDate);
          if (gvgResponse.data.success) {
            gvgData = gvgResponse.data.data || [];
          }
        } catch (error) {
          console.log('Failed to get GVG data, service endpoint may not exist');
        }
      }

      // Analyze data
      const results = analyzeData(guildMembers, kvmData, aaData, gvgData);
      setAnalysisResults(results);

      message.success(t('dataAnalysis.analysisComplete', { kvmCount: kvmData.length, aaCount: aaData.length, gvgCount: gvgData.length }));
    } catch (error) {
      console.error('Data analysis failed:', error);
      message.error(t('dataAnalysis.analysisError'));
    } finally {
      setLoading(false);
    }
  };

  // Data analysis logic
  const analyzeData = (members: any[], kvmData: KVMInfo[], aaData: AAInfo[], gvgData: GVGInfo[]): AnalysisResult[] => {
    const results: AnalysisResult[] = [];

    members.forEach(member => {
      let kvmAbsentCount = 0;
      let aaAbsentCount = 0;
      let gvgAbsentCount = 0;
      const kvmDetails: { date: string; status: 'absent' | 'present' }[] = [];
      const aaDetails: { date: string; status: 'absent' | 'present' }[] = [];
      const gvgDetails: { date: string; status: 'absent' | 'present' }[] = [];

      // Count KVM absence times and details
      kvmData.forEach(kvm => {
        // If member has creation time, check if creation time is later than activity time
        if (member.createdAt && kvm.date) {
          const memberCreatedDate = dayjs(member.createdAt).format('YYYY-MM-DD');
          const kvmDate = dayjs(kvm.date).format('YYYY-MM-DD');
          
          // If member creation time is later than KVM time, skip this count
          if (dayjs(memberCreatedDate).isAfter(dayjs(kvmDate))) {
            return;
          }
        }
        
        // Check if in non-participant list
        const isNonParticipant = kvm.non_participants?.some(p => p.name?.trim() === member.name?.trim());
        const status = isNonParticipant ? 'absent' : 'present';
        kvmDetails.push({ date: kvm.date, status });
        
        if (isNonParticipant) {
          kvmAbsentCount++;
        }
      });

      // Count AA absence times and details
      aaData.forEach(aa => {
        // If member has creation time, check if creation time is later than activity time
        if (member.createdAt && aa.date) {
          const memberCreatedDate = dayjs(member.createdAt).format('YYYY-MM-DD');
          const aaDate = dayjs(aa.date).format('YYYY-MM-DD');
          
          // If member creation time is later than AA time, skip this count
          if (dayjs(memberCreatedDate).isAfter(dayjs(aaDate))) {
            return;
          }
        }
        
        const participated = aa.participants?.some(p => p.name?.trim() === member.name?.trim());
        const status = participated ? 'present' : 'absent';
        aaDetails.push({ date: aa.date, status });
        
        if (!participated) {
          aaAbsentCount++;
        }
      });

      // Count GVG absence times and details
      gvgData.forEach(gvg => {
        // If member has creation time, check if creation time is later than activity time
        if (member.createdAt && gvg.date) {
          const memberCreatedDate = dayjs(member.createdAt).format('YYYY-MM-DD');
          const gvgDate = dayjs(gvg.date).format('YYYY-MM-DD');
          
          // If member creation time is later than GVG time, skip this count
          if (dayjs(memberCreatedDate).isAfter(dayjs(gvgDate))) {
            return;
          }
        }
        
        // Check if in non-participant list
        const isNonParticipant = gvg.non_participants?.some(p => p.name?.trim() === member.name?.trim());
        const status = isNonParticipant ? 'absent' : 'present';
        gvgDetails.push({ date: gvg.date, status });
        
        if (isNonParticipant) {
          gvgAbsentCount++;
        }
      });

      // Only show members with absence records
      if ((includeKVM && kvmAbsentCount > 0) || (includeAA && aaAbsentCount > 0) || (includeGVG && gvgAbsentCount > 0)) {
        results.push({
          memberId: member.id,
          memberName: member.name,
          class: member.class,
          createAt: member.createdAt,
          kvmAbsentCount: includeKVM ? kvmAbsentCount : 0,
          aaAbsentCount: includeAA ? aaAbsentCount : 0,
          gvgAbsentCount: includeGVG ? gvgAbsentCount : 0,
          kvmDetails: includeKVM ? kvmDetails : undefined,
          aaDetails: includeAA ? aaDetails : undefined,
          gvgDetails: includeGVG ? gvgDetails : undefined
        });
      }
    });

    // Sort by total absence count
    return results.sort((a, b) => {
      const totalA = (a.kvmAbsentCount || 0) + a.aaAbsentCount + a.gvgAbsentCount;
      const totalB = (b.kvmAbsentCount || 0) + b.aaAbsentCount + b.gvgAbsentCount;
      return totalB - totalA;
    });
  };

  // Table column configuration
  const columns = [
    {
      title: t('dataAnalysis.guildId'),
      dataIndex: 'memberId',
      key: 'memberId',
      width: 80,
      render: (id: number) => (
        <Text style={{ fontSize: '12px', color: '#1890ff' }}>{id}</Text>
      )
    },
    {
      title: t('dataAnalysis.memberName'),
      dataIndex: 'memberName',
      key: 'memberName',
      width: 150,
      ellipsis: true,
      render: (name: string) => (
        <Text strong title={name}>{name}</Text>
      )
    },
    {
      title: t('common.class'),
      dataIndex: 'class',
      key: 'class',
      width: 120,
      render: (className: string) => (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '4px 8px',
          backgroundColor: getClassColor(className || ''),
          borderRadius: '6px',
          border: '1px solid #d9d9d9'
        }}>
          <img 
            src={`/images/classes/${className || 'unknown'}.webp`}
            alt={className || 'unknown'}
            style={{
              width: '24px',
              height: '24px',
              objectFit: 'contain',
              flexShrink: 0
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/classes/unknown.webp';
            }}
          />
          <Text style={{ fontWeight: 'bold', fontSize: '12px' }}>{className || 'unknown'}</Text>
        </div>
      )
    },
    ...(includeKVM ? [{
      title: t('dataAnalysis.kvmAbsentCount'),
      dataIndex: 'kvmAbsentCount',
      key: 'kvmAbsentCount',
      width: 150,
      render: (count: number, record: AnalysisResult) => (
        <Space>
          <Text style={{ color: count > 0 ? '#ff4d4f' : '#666' }}>{count || 0} {t('dataAnalysis.times')}</Text>
          {record.kvmDetails && record.kvmDetails.length > 0 && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedMemberDetails(record);
                setDetailModalVisible(true);
              }}
            />
          )}
        </Space>
      ),
      sorter: (a: AnalysisResult, b: AnalysisResult) => (a.kvmAbsentCount || 0) - (b.kvmAbsentCount || 0)
    }] : []),
    ...(includeAA ? [{
      title: t('dataAnalysis.aaAbsentCount'),
      dataIndex: 'aaAbsentCount',
      key: 'aaAbsentCount',
      width: 150,
      render: (count: number, record: AnalysisResult) => (
        <Space>
          <Text style={{ color: count > 0 ? '#ff4d4f' : '#666' }}>{count} {t('dataAnalysis.times')}</Text>
          {record.aaDetails && record.aaDetails.length > 0 && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedMemberDetails(record);
                setDetailModalVisible(true);
              }}
            />
          )}
        </Space>
      ),
      sorter: (a: AnalysisResult, b: AnalysisResult) => a.aaAbsentCount - b.aaAbsentCount
    }] : []),
    ...(includeGVG ? [{
      title: t('dataAnalysis.gvgAbsentCount'),
      dataIndex: 'gvgAbsentCount',
      key: 'gvgAbsentCount',
      width: 150,
      render: (count: number, record: AnalysisResult) => (
        <Space>
          <Text style={{ color: count > 0 ? '#ff4d4f' : '#666' }}>{count} {t('dataAnalysis.times')}</Text>
          {record.gvgDetails && record.gvgDetails.length > 0 && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedMemberDetails(record);
                setDetailModalVisible(true);
              }}
            />
          )}
        </Space>
      ),
      sorter: (a: AnalysisResult, b: AnalysisResult) => a.gvgAbsentCount - b.gvgAbsentCount
    }] : []),
    {
      title: t('dataAnalysis.totalAbsentCount'),
      key: 'totalAbsent',
      width: 120,
      render: (_: any, record: AnalysisResult) => {
        const total = (record.kvmAbsentCount || 0) + record.aaAbsentCount + record.gvgAbsentCount;
        return <Text strong style={{ color: '#ff4d4f' }}>{total} {t('dataAnalysis.times')}</Text>;
      },
      sorter: (a: AnalysisResult, b: AnalysisResult) => {
        const totalA = (a.kvmAbsentCount || 0) + a.aaAbsentCount + a.gvgAbsentCount;
        const totalB = (b.kvmAbsentCount || 0) + b.aaAbsentCount + b.gvgAbsentCount;
        return totalA - totalB;
      }
    }
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>
        {`
          .compact-table .ant-table-tbody > tr > td {
            padding: 2px 6px !important;
            line-height: 1.0 !important;
            vertical-align: middle !important;
          }
          .compact-table .ant-table-thead > tr > th {
            // padding: 2px 6px !important;
            // line-height: 1.0 !important;
            // height: 24px !important;
            // vertical-align: middle !important;
            // min-height: 24px !important;
            // max-height: 24px !important;
          }
        `}
      </style>
      {/* Title and query conditions */}
      <Card style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <BarChartOutlined style={{ marginRight: 8 }} />
            {t('dataAnalysis.title')}
          </Title>
          <Text type="secondary">{t('dataAnalysis.description')}</Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* First row: date range selection and quick selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <Text strong style={{ marginRight: 8 }}>{t('dataAnalysis.dateRange')}:</Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                format="YYYY-MM-DD"
                placeholder={[t('dataAnalysis.startDate'), t('dataAnalysis.endDate')]}
              />
            </div>
            
            <div>
              <Text strong style={{ marginRight: 8 }}>{t('dataAnalysis.quickSelect')}:</Text>
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    const end = dayjs();
                    const start = end.subtract(15, 'day');
                    setDateRange([start, end]);
                  }}
                >
                  {t('dataAnalysis.last15Days')}
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const end = dayjs();
                    const start = end.subtract(30, 'day');
                    setDateRange([start, end]);
                  }}
                >
                  {t('dataAnalysis.last30Days')}
                </Button>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={performAnalysis}
                  loading={loading}
                  disabled={!dateRange || (!includeKVM && !includeAA && !includeGVG)}
                >
                  {t('dataAnalysis.startAnalysis')}
                </Button>
              </Space>
            </div>

            {/* Activity type selection */}
            <div>
              <Text strong style={{ marginRight: 8 }}>{t('dataAnalysis.activityType')}:</Text>
              <Space>
                <Checkbox
                  checked={includeKVM}
                  onChange={(e) => setIncludeKVM(e.target.checked)}
                >
                  {t('dataAnalysis.kvmActivity')}
                </Checkbox>
                <Checkbox
                  checked={includeAA}
                  onChange={(e) => setIncludeAA(e.target.checked)}
                >
                  {t('dataAnalysis.aaActivity')}
                </Checkbox>
                <Checkbox
                  checked={includeGVG}
                  onChange={(e) => setIncludeGVG(e.target.checked)}
                >
                  {t('dataAnalysis.gvgActivity')}
                </Checkbox>
              </Space>
            </div>
          </div>
        </div>
      </Card>

      {/* Analysis results */}
      <Card 
        title={`${t('dataAnalysis.absentMembersList')}${analysisResults.length > 0 ? ` (${analysisResults.length}${t('dataAnalysis.people')})` : ''}`}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: '8px 16px', overflow: 'hidden' }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <Spin size="large" />
            <Text style={{ marginLeft: 12 }}>{t('dataAnalysis.analyzing')}</Text>
          </div>
        ) : analysisResults.length > 0 ? (
          <Table
            dataSource={analysisResults}
            columns={columns}
            rowKey="memberId"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (page, size) => {
                setCurrentPage(page);
                if (size !== pageSize) {
                  setPageSize(size);
                  setCurrentPage(1);
                }
              },
              onShowSizeChange: (current, size) => {
                setPageSize(size);
                setCurrentPage(1);
              }
            }}
            scroll={{ x: 'max-content', y: 'calc(100vh - 420px)' }}
            size="small"
            className="compact-table"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
            <BarChartOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <p>{t('dataAnalysis.noResults')}</p>
            <p style={{ fontSize: '12px' }}>{t('dataAnalysis.resultsDescription')}</p>
          </div>
        )}
      </Card>
      
      {/* Details Modal */}
      <Modal
        title={selectedMemberDetails ? `${selectedMemberDetails.memberName} - ${t('dataAnalysis.participationDetails')} | CreateAt: ${selectedMemberDetails.createAt || 'long time ago'}` : ''}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedMemberDetails(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setSelectedMemberDetails(null);
          }}>
            {t('common.close')}
          </Button>
        ]}
        width={800}
      >
        {selectedMemberDetails && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {/* KVM details */}
            {includeKVM && selectedMemberDetails.kvmDetails && selectedMemberDetails.kvmDetails.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Title level={5}>KVM {t('dataAnalysis.participationRecord')}</Title>
                <Table
                  dataSource={selectedMemberDetails.kvmDetails.map((detail, index) => ({ ...detail, key: index }))}
                  columns={[
                    {
                      title: t('common.date'),
                      dataIndex: 'date',
                      key: 'date',
                      width: 120
                    },
                    {
                      title: t('dataAnalysis.status'),
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === 'absent' ? 'red' : 'green'}>
                          {status === 'absent' ? t('dataAnalysis.absent') : t('dataAnalysis.participated')}
                        </Tag>
                      )
                    }
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
            )}
            
            {/* AA details */}
            {includeAA && selectedMemberDetails.aaDetails && selectedMemberDetails.aaDetails.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Title level={5}>AA {t('dataAnalysis.participationRecord')}</Title>
                <Table
                  dataSource={selectedMemberDetails.aaDetails.map((detail, index) => ({ ...detail, key: index }))}
                  columns={[
                    {
                      title: t('common.date'),
                      dataIndex: 'date',
                      key: 'date',
                      width: 120
                    },
                    {
                      title: t('dataAnalysis.status'),
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === 'absent' ? 'red' : 'green'}>
                          {status === 'absent' ? t('dataAnalysis.absent') : t('dataAnalysis.participated')}
                        </Tag>
                      )
                    }
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
            )}
            
            {/* GVG details */}
            {includeGVG && selectedMemberDetails.gvgDetails && selectedMemberDetails.gvgDetails.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Title level={5}>GVG {t('dataAnalysis.participationRecord')}</Title>
                <Table
                  dataSource={selectedMemberDetails.gvgDetails.map((detail, index) => ({ ...detail, key: index }))}
                  columns={[
                    {
                      title: t('common.date'),
                      dataIndex: 'date',
                      key: 'date',
                      width: 120
                    },
                    {
                      title: t('dataAnalysis.status'),
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === 'absent' ? 'red' : 'green'}>
                          {status === 'absent' ? t('dataAnalysis.absent') : t('dataAnalysis.participated')}
                        </Tag>
                      )
                    }
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DataAnalysis;