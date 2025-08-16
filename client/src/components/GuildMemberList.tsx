import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Table, Tag, Button, Space, Tooltip, Modal, message, Input, Select, InputNumber, Typography } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { EditOutlined, DeleteOutlined, CameraOutlined, PieChartOutlined, ExclamationCircleOutlined, PlusOutlined, CheckOutlined, CloseOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { GuildMember } from '../types';
import { useGuildMembers } from '../hooks/useGuildMembers';
import { useOptimizedDataManager } from '../hooks/useOptimizedDataManager';
import { useTranslation } from '../hooks/useTranslation';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions';
import GuildMemberForm from './GuildMemberForm';
import EnhancedImageRecognition from './EnhancedImageRecognition';
import ClassDistributionChart from './ClassDistributionChart';
import EditableClass from './EditableClass';
import EditableCreatedAt from './EditableCreatedAt';

// Editable name component
interface EditableNameProps {
  name: string;
  record: GuildMember;
  onUpdate: (id: number, member: GuildMember) => Promise<void>;
}

const EditableName: React.FC<EditableNameProps> = ({ name, record, onUpdate }) => {
  const { t } = useTranslation();
  const { canUpdate } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<any>(null);
  
  const canEdit = canUpdate('guild_members');

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(name);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSave = async () => {
    if (editValue.trim() && editValue !== name) {
      try {
        const memberId = record.id;
        if (!memberId) {
          throw new Error(t('guildMember.messages.invalidMemberId'));
        }
        await onUpdate(memberId, { ...record, name: editValue.trim() });
        setIsEditing(false);
        message.success(t('guildMember.messages.nameUpdateSuccess'));
      } catch (error) {
        console.error('Failed to update name:', error);
        setEditValue(name); // Restore original value
        message.error(t('guildMember.messages.nameUpdateFailed'));
      }
    } else {
      setIsEditing(false);
      setEditValue(name);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(name);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyPress}
        onBlur={handleSave}
        size="small"
        style={{ width: '120px' }}
      />
    );
  }

  if (!canEdit) {
    return (
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
    );
  }

  return (
    <div 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 2, 
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
        maxWidth: '100%'
      }}
      onClick={handleEdit}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f5f5f5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      <EditOutlined style={{ fontSize: '12px', color: '#999', opacity: 0.6, marginLeft: '2px' }} />
    </div>
  );
};

// Editable sort component
interface EditableSortProps {
  sort: number;
  record: GuildMember;
  onUpdate: (id: number, member: GuildMember) => Promise<void>;
}

const EditableSort: React.FC<EditableSortProps> = ({ sort, record, onUpdate }) => {
  const { t } = useTranslation();
  const { canUpdate } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(sort || 0);
  const inputRef = useRef<any>(null);
  
  const canEdit = canUpdate('guild_members');

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(sort || 0);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSave = async () => {
    if (editValue !== sort) {
      try {
        const memberId = record.id;
        if (!memberId) {
          throw new Error(t('guildMember.messages.invalidMemberId'));
        }
        await onUpdate(memberId, { ...record, sort: editValue });
        setIsEditing(false);
        message.success(t('guildMember.messages.sortUpdateSuccess'));
      } catch (error) {
        console.error('Failed to update sort:', error);
        setEditValue(sort || 0); // Restore original value
        message.error(t('guildMember.messages.sortUpdateFailed'));
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(sort || 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <InputNumber
        ref={inputRef}
        value={editValue}
        onChange={(value) => setEditValue(value || 0)}
        onKeyDown={handleKeyPress}
        onBlur={handleSave}
        size="small"
        style={{ width: '80px' }}
        min={0}
      />
    );
  }

  if (!canEdit) {
    return (
      <span style={{ color: '#666' }}>
        {sort || 0}
      </span>
    );
  }

  return (
    <div 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 2, 
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
        maxWidth: '100%'
      }}
      onClick={handleEdit}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f5f5f5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ color: '#666' }}>
        {sort || 0}
      </span>
      <EditOutlined style={{ fontSize: '12px', color: '#999', opacity: 0.6, marginLeft: '2px' }} />
    </div>
  );
};

const { Title, Text } = Typography;

const GuildMemberList: React.FC = () => {
  const { t } = useTranslation();
  const { t: i18nT } = useI18nTranslation();
  const { members, loading: membersLoading, error, deleteMember, deleteAllMembers, fetchMembers, addMember, updateMember } = useGuildMembers();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  
  // Use optimized data management Hook
  const {
    classes,
    aaParticipation,
    gvgParticipation,
    loading: dataLoading,
    aaLoading,
    gvgLoading,
    refreshAllData,
    clearParticipationCache,
    getClassColor,
    cacheStatus
  } = useOptimizedDataManager(members);
  
  const [editingMember, setEditingMember] = React.useState<GuildMember | null>(null);
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = React.useState(false);
  const [isImageRecognitionVisible, setIsImageRecognitionVisible] = React.useState(false);
  const [isClassDistributionVisible, setIsClassDistributionVisible] = React.useState(false);
  const [selectedClass, setSelectedClass] = React.useState<string | undefined>(undefined);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<GuildMember | null>(null);

  // Position tag color mapping
  const positionColorMap: Record<string, string> = {
    [t('guildMember.role.leader')]: 'red',
    [t('guildMember.role.officer')]: 'orange',
    'Officer': 'blue',
    [t('guildMember.role.member')]: 'green',
  };

  // Function to manually refresh cache
  const handleRefreshCache = async () => {
    try {
      await refreshAllData();
      message.success('Cache refreshed - Batch request optimization enabled');
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      message.error('Failed to refresh cache');
    }
  };

  // Class tag color mapping (using optimized method)
  const getClassColorWithTransparency = (className: string) => {
    const color = getClassColor(className);
    // Convert color to lighter background color
    return color + '40'; // Add transparency
  };

  // Gender tag color mapping
  const genderColorMap: Record<string, string> = {
    'Male': 'blue',
    'Female': 'pink',
  };

  // All data loading is now managed uniformly by useOptimizedDataManager

  // Get all class options
  const classOptions = useMemo(() => {
    const memberClasses = Array.from(new Set(members.map(member => member.class).filter(Boolean)));
    return memberClasses.map(cls => ({ label: cls, value: cls }));
  }, [members]);

  // Filtered member list
  const filteredMembers = useMemo(() => {
    if (!selectedClass) {
      return members;
    }
    return members.filter(member => member.class === selectedClass);
  }, [members, selectedClass]);

  // Handle member deletion
  const handleDelete = async (id: number, name: string) => {
    Modal.confirm({
      title: t('guildMember.messages.confirmDelete'),
      content: t('guildMember.messages.confirmDeleteContent', { name }),
      okText: t('guildMember.messages.confirm'),
      cancelText: t('guildMember.messages.cancel'),
      onOk: async () => {
        try {
          await deleteMember(id);
          message.success(t('guildMember.messages.deleteSuccess'));
        } catch (error) {
          message.error(t('guildMember.messages.deleteFailed'));
        }
      },
    });
  };

  // Handle delete all members
  const handleDeleteAll = async () => {
    Modal.confirm({
      title: t('guildMember.messages.confirmDeleteAll'),
      content: t('guildMember.messages.confirmDeleteAllContent', { count: members.length }),
      okText: t('guildMember.messages.confirm'),
      cancelText: t('guildMember.messages.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteAllMembers();
          message.success(t('guildMember.messages.deleteAllSuccess'));
        } catch (error) {
          message.error(t('guildMember.messages.deleteAllFailed'));
        }
      },
    });
  };

  // Handle edit member
  const handleEdit = (member: GuildMember) => {
    setEditingMember(member);
    setIsModalVisible(true);
  };

  // Handle image recognition success
  const handleImageRecognitionSuccess = async (data: any[], module: string) => {
    if (module === 'guild' && Array.isArray(data)) {
      try {
        // Get the maximum index from current member list
        const maxId = members.length > 0 ? Math.max(...members.map(m => m.id || 0)) : 0;
        
        // Batch add members
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < data.length; i++) {
          const memberData = data[i];
          try {
            // Reset index based on existing members' maximum index increment
            const processedMemberData = {
              ...memberData,
              index: maxId + i + 1,
              // Remove original id, let server regenerate
              id: undefined
            };
            
            await addMember(processedMemberData);
            successCount++;
          } catch (error) {
            console.error('Add member failed:', error);
            errorCount++;
          }
        }
        
        if (successCount > 0) {
          message.success(t('guildMember.messages.batchAddSuccess', { 
            success: successCount, 
            total: data.length 
          }));
          fetchMembers(); // Refresh member list
        }
        
        if (errorCount > 0) {
          message.warning(t('guildMember.messages.batchAddPartialError', { 
            error: errorCount, 
            total: data.length 
          }));
        }
      } catch (error) {
        console.error('Batch add members failed:', error);
        message.error(t('guildMember.messages.batchAddFailed'));
      }
    }
  };

  // Table column definitions
  const columns: ColumnType<GuildMember>[] = [
    {
      title: t('guildMember.columns.id'),
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: (a: GuildMember, b: GuildMember) => (a.id || 0) - (b.id || 0),
      render: (id: number) => <span style={{ color: '#666' }}>#{id}</span>,
    },
    {
      title: t('guildMember.columns.sort'),
      dataIndex: 'sort',
      key: 'sort',
      width: 100,
      sorter: (a: GuildMember, b: GuildMember) => (a.sort || 0) - (b.sort || 0),
      render: (sort: number, record: GuildMember) => (
        <EditableSort 
          key={`editable-sort-${record.id}`}
          sort={sort || 0} 
          record={record} 
          onUpdate={updateMember} 
        />
      ),
    },
    {
      title: t('guildMember.columns.class'),
      dataIndex: 'class',
      key: 'class',
      width: 150,
      sorter: (a: GuildMember, b: GuildMember) => (a.class || '').localeCompare(b.class || ''),
      render: (className: string, record: GuildMember) => (
        <EditableClass 
          key={`editable-class-${record.id}`}
          className={className || ''} 
          record={record} 
          onUpdate={updateMember} 
        />
      ),
    },
    {
      title: t('guildMember.columns.name'),
      dataIndex: 'name',
      key: 'name',
      width: 120,
      sorter: (a: GuildMember, b: GuildMember) => a.name.localeCompare(b.name),
      render: (name: string, record: GuildMember) => (
        <EditableName 
          key={`editable-name-${record.id}`}
          name={name} 
          record={record} 
          onUpdate={updateMember} 
        />
      ),
    },
    {
      title: t('guildMember.columns.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      sorter: (a: GuildMember, b: GuildMember) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      },
      render: (createdAt: string, record: GuildMember) => (
        <EditableCreatedAt 
          key={`editable-createdAt-${record.id}`}
          createdAt={createdAt || ''} 
          record={record} 
          onUpdate={updateMember} 
        />
      ),
    },
  ];

  // Dynamically add AA and GVG participation columns (in chronological order)
  const allActivityDates: Array<{date: string, type: 'aa' | 'gvg'}> = [];
  
  // Collect all AA dates
  if (aaParticipation && Object.keys(aaParticipation).length > 0) {
    const aaDates = new Set<string>();
    Object.values(aaParticipation).forEach(memberData => {
      Object.keys(memberData).forEach(date => aaDates.add(date));
    });
    aaDates.forEach(date => allActivityDates.push({date, type: 'aa'}));
  }
  
  // Collect all GVG dates
  if (gvgParticipation && Object.keys(gvgParticipation).length > 0) {
    const gvgDates = new Set<string>();
    Object.values(gvgParticipation).forEach(memberData => {
      Object.keys(memberData).forEach(date => gvgDates.add(date));
    });
    gvgDates.forEach(date => allActivityDates.push({date, type: 'gvg'}));
  }
  
  // Sort by date in descending order, take the latest 8 activities
  const sortedActivityDates = allActivityDates
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
  
  // Add a column for each activity date
  sortedActivityDates.forEach(({date, type}) => {
    // Format date title
    const formatDate = (dateStr: string, activityType: 'aa' | 'gvg') => {
      const [year, month, day] = dateStr.split('-');
      const prefix = activityType === 'aa' ? 'A' : 'G';
      return `${prefix}-${parseInt(month)}/${parseInt(day)}/${year.slice(-2)}`;
    };

    columns.push({
      title: formatDate(date, type),
      key: `${type}_${date}`,
      width: 80,
      align: 'center' as const,
      className: type === 'aa' ? 'aa-column' : 'gvg-column',
      onHeaderCell: () => ({
        style: {
          backgroundColor: type === 'aa' ? '#e6f7ff' : '#f6ffed',
          borderColor: type === 'aa' ? '#91d5ff' : '#b7eb8f'
        }
      }),
      onCell: () => ({
        style: {
          backgroundColor: type === 'aa' ? '#e6f7ff' : '#f6ffed',
          borderColor: type === 'aa' ? '#91d5ff' : '#b7eb8f'
        }
      }),
      render: (_: any, record: GuildMember) => {
        // Check if member creation time is later than activity date
        const memberCreatedAt = new Date(record.createdAt || '');
        const activityDate = new Date(date);
        
        // Get participation data based on activity type
        const participationData = type === 'aa' ? aaParticipation : gvgParticipation;
        const memberData = participationData[record.name];
        
        if (!memberData) {
          // Member is not in any records
          if (activityDate < memberCreatedAt) {
            // Activity date is earlier than member creation time, show circle
            return <span style={{ color: '#d48806', fontSize: '18px', fontWeight: 'bold' }}>○</span>;
          } else {
            // Activity date is later than or equal to member creation time, show dash
            return <span style={{ color: '#8c8c8c', fontSize: '16px' }}>-</span>;
          }
        }
        
        const participated = memberData[date];
        if (participated === undefined) {
          // No record for this date
          if (activityDate < memberCreatedAt) {
            // Activity date is earlier than member creation time, show circle
            return <span style={{ color: '#d48806', fontSize: '18px', fontWeight: 'bold' }}>○</span>;
          } else {
            // Activity date is later than or equal to member creation time, show dash
            return <span style={{ color: '#8c8c8c', fontSize: '16px' }}>-</span>;
          }
        }
        
        // Has record, but still need to check date
        if (activityDate < memberCreatedAt) {
          // Activity date is earlier than member creation time, show circle
          return <span style={{ color: '#d48806', fontSize: '18px', fontWeight: 'bold' }}>○</span>;
        }
        
        // Activity date is later than or equal to member creation time, show participation status based on activity type
        return participated ? 
          <CheckOutlined style={{ color: '#389e0d', fontSize: '18px', fontWeight: 'bold' }} /> : 
          <CloseOutlined style={{ color: '#cf1322', fontSize: '18px', fontWeight: 'bold' }} />;
      },
    });
  });

  // Function to calculate total absences for a member
  const getAbsentCount = (member: GuildMember) => {
    let absentCount = 0;
    const memberCreatedAt = new Date(member.createdAt || 0);
    
    // Calculate AA absence count (AA data records participation status, false means absent)
    const aaData = aaParticipation[member.name];
    if (aaData) {
      Object.entries(aaData).forEach(([date, participated]) => {
        const activityDate = new Date(date);
        if (activityDate >= memberCreatedAt && participated === false) {
          absentCount++;
        }
      });
    }
    
    // Calculate GVG absence count (GVG data records participation status, false means absent)
    const gvgData = gvgParticipation[member.name];
    if (gvgData) {
      Object.entries(gvgData).forEach(([date, participated]) => {
        const activityDate = new Date(date);
        if (activityDate >= memberCreatedAt && participated === false) {
          absentCount++;
        }
      });
    }
    
    return absentCount;
  };

  // Add details view column
  columns.push({
    title: t('common.actions'),
    key: 'actions',
    width: 120,
    align: 'center' as const,
    sorter: (a: GuildMember, b: GuildMember) => {
      return getAbsentCount(b) - getAbsentCount(a); // Descending order, members with more absences first
    },
    render: (_: any, record: GuildMember) => {
      const absentCount = getAbsentCount(record);
      return (
        <Space>
          <span style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: '12px' }}>
            {absentCount}
          </span>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedMemberForDetail(record);
              setDetailModalVisible(true);
            }}
            title="View participation details"
          />
        </Space>
      );
    },
  });

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#ff4d4f' }}>
        {t('guildMember.messages.loadFailed')}: {error}
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      {/* Action buttons area */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexShrink: 0 
      }}>
        <div>
          {canCreate('guild_members') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsAddModalVisible(true)}
              style={{ marginRight: 8 }}
            >
              {t('guildMember.addMember')}
            </Button>
          )}
          {canCreate('guild_members') && (
            <Button
              type="primary"
              icon={<CameraOutlined />}
              onClick={() => setIsImageRecognitionVisible(true)}
              style={{ marginRight: 8 }}
            >
              {t('guildMember.imageRecognition')}
            </Button>
          )}
          <Button
            icon={<PieChartOutlined />}
            onClick={() => setIsClassDistributionVisible(true)}
            style={{ marginRight: 8 }}
          >
            {t('guildMember.classDistribution')}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshCache}
            loading={dataLoading}
            style={{ marginRight: 8 }}
            title={`${i18nT('guildMember.messages.refreshCacheData')} - Classes:${cacheStatus.classes ? t('guildMember.messages.cached') : t('guildMember.messages.uncached')} AA:${cacheStatus.aa ? t('guildMember.messages.cached') : t('guildMember.messages.uncached')} GVG:${cacheStatus.gvg ? t('guildMember.messages.cached') : t('guildMember.messages.uncached')}`}
          >
            {t('guildMember.messages.refreshCache')}
          </Button>
          {/* Delete all members button is hidden */}
          {/* <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeleteAll}
            disabled={members.length === 0}
            style={{ marginRight: 8 }}
          >
            {t('guildMember.deleteAll')}
          </Button> */}
          <Select
            placeholder={i18nT('guildMember.classFilter')}
            allowClear
            style={{ width: 120, marginRight: 8 }}
            value={selectedClass}
            onChange={setSelectedClass}
            options={[
              { label: i18nT('guildMember.allClasses'), value: undefined },
              ...classOptions
            ]}
          />
          <span style={{ color: '#666', fontSize: 14 }}>
            {t('guildMember.messages.supportInfo')}
          </span>
        </div>
        <div>
          <span style={{ color: '#666', fontSize: 14 }}>
            {selectedClass 
              ? `${selectedClass} ${i18nT('guildMember.filtered')}: ${filteredMembers.length}`
              : `${i18nT('guildMember.memberCount')}: ${filteredMembers.length}`
            }
          </span>
        </div>
      </div>

      {/* Table area */}
      <div style={{ 
        flex: 1, 
        minHeight: 0,
        border: '1px solid #d9d9d9',
        borderRadius: '6px'
      }}>
        <Table
          columns={columns}
          dataSource={filteredMembers}
          rowKey="id"
          loading={membersLoading || dataLoading}
          pagination={false}
          scroll={{ x: 1200, y: 'calc(100vh - 270px)' }}
          size="small"
        />
      </div>

      {/* Edit member modal */}
      <GuildMemberForm
        visible={isModalVisible}
        member={editingMember}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingMember(null);
        }}
        onSuccess={() => {
          setIsModalVisible(false);
          setEditingMember(null);
        }}
        onAddMember={addMember}
        onUpdateMember={updateMember}
      />

      {/* Add member modal */}
      <GuildMemberForm
        visible={isAddModalVisible}
        member={null}
        onCancel={() => {
          setIsAddModalVisible(false);
        }}
        onSuccess={() => {
          setIsAddModalVisible(false);
        }}
        onAddMember={addMember}
        onUpdateMember={updateMember}
      />

      {/* Image recognition modal */}
      <EnhancedImageRecognition
        isOpen={isImageRecognitionVisible}
        onClose={() => setIsImageRecognitionVisible(false)}
        onSuccess={handleImageRecognitionSuccess}
        module="guild"
      />

      {/* Class distribution chart modal */}
      <ClassDistributionChart
        visible={isClassDistributionVisible}
        onClose={() => setIsClassDistributionVisible(false)}
        members={members}
      />

      {/* Member participation details modal */}
      <Modal
        title={`${selectedMemberForDetail?.name} - ${t('guildMember.participationDetails')}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedMemberForDetail(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setSelectedMemberForDetail(null);
          }}>
            {t('common.close')}
          </Button>
        ]}
        width={800}
      >
        {selectedMemberForDetail && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {/* Member basic information */}
            <div style={{ marginBottom: 24, padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
              <Title level={5} style={{ marginBottom: 12 }}>{t('guildMember.memberInfo')}</Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <Text strong>{t('guildMember.name')}: </Text>
                  <Text>{selectedMemberForDetail.name}</Text>
                </div>
                <div>
                  <Text strong>{t('guildMember.class')}: </Text>
                  <Text>{selectedMemberForDetail.class || t('guildMember.unknown')}</Text>
                </div>
                <div>
                  <Text strong>{t('guildMember.createdAt')}: </Text>
                  <Text>
                    {selectedMemberForDetail.createdAt 
                      ? new Date(selectedMemberForDetail.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })
                      : t('guildMember.longTimeAgo')
                    }
                  </Text>
                </div>
              </div>
            </div>
            
            {/* AA details */}
            {aaParticipation[selectedMemberForDetail.name] && (
              <div style={{ marginBottom: 24 }}>
                <Title level={5}>{t('guildMember.aaParticipationRecord')}</Title>
                <Table
                  dataSource={Object.entries(aaParticipation[selectedMemberForDetail.name])
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([date, participated], index) => ({
                      key: index,
                      date,
                      status: participated ? 'present' : 'absent'
                    }))}
                  columns={[
                    {
                      title: t('common.date'),
                      dataIndex: 'date',
                      key: 'date',
                      width: 120,
                      render: (date: string) => {
                        const [year, month, day] = date.split('-');
                        return `${parseInt(month)}/${parseInt(day)}/${year.slice(-2)}`;
                      }
                    },
                    {
                      title: t('guildMember.status'),
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string, record: any) => {
                        // Check if member creation time is later than activity date
                        const memberCreatedAt = new Date(selectedMemberForDetail?.createdAt || '');
                        const activityDate = new Date(record.date);
                        
                        if (activityDate < memberCreatedAt) {
                          // Activity date is earlier than member creation time, show circle
                          return <span style={{ color: '#faad14', fontSize: '16px' }}>○</span>;
                        }
                        
                        // Show checkmark or X based on participation status
                        return status === 'absent' ? 
                          <CloseOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} /> : 
                          <CheckOutlined style={{ color: '#52c41a', fontSize: '16px' }} />;
                      }
                    }
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
            )}
            
            {/* GVG details */}
            {gvgParticipation[selectedMemberForDetail.name] && (
              <div style={{ marginBottom: 24 }}>
                <Title level={5}>{t('guildMember.gvgParticipationRecord')}</Title>
                <Table
                  dataSource={Object.entries(gvgParticipation[selectedMemberForDetail.name])
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([date, participated], index) => ({
                      key: index,
                      date,
                      status: participated ? 'present' : 'absent'
                    }))}
                  columns={[
                    {
                      title: t('common.date'),
                      dataIndex: 'date',
                      key: 'date',
                      width: 120,
                      render: (date: string) => {
                        const [year, month, day] = date.split('-');
                        return `${parseInt(month)}/${parseInt(day)}/${year.slice(-2)}`;
                      }
                    },
                    {
                      title: t('guildMember.status'),
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string, record: any) => {
                        // Check if member creation time is later than activity date
                        const memberCreatedAt = new Date(selectedMemberForDetail?.createdAt || '');
                        const activityDate = new Date(record.date);
                        
                        if (activityDate < memberCreatedAt) {
                          // Activity date is earlier than member creation time, show circle
                          return <span style={{ color: '#faad14', fontSize: '16px' }}>○</span>;
                        }
                        
                        // Show checkmark or X based on participation status
                        return status === 'absent' ? 
                          <CloseOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} /> : 
                          <CheckOutlined style={{ color: '#52c41a', fontSize: '16px' }} />;
                      }
                    }
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
            )}
            
            {/* If there are no records */}
            {!aaParticipation[selectedMemberForDetail.name] && !gvgParticipation[selectedMemberForDetail.name] && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <Text>{t('guildMember.noParticipationRecord')}</Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GuildMemberList;