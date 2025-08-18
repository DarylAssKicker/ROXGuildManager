import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Card, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Space, 
  message, 
  Typography, 
  Tag, 
  Row, 
  Col,
  List,
  Avatar,
  Tooltip,
  Empty,
  Divider,
  Tabs,
  Switch
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  TeamOutlined, 
  UserOutlined,
  CrownOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons';
import { DndProvider, useDrag, useDrop, DragPreviewImage, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useTranslation } from '../../hooks/useTranslation';
import { useGuildMembers } from '../../hooks/useGuildMembers';
import { usePermissions } from '../../hooks/usePermissions';
import groupPartyApi, { 
  Group, 
  Party, 
  GroupWithParties, 
  PartyWithMembers,
  CreateGroupRequest,
  CreatePartyRequest,
  AssignMemberToPartyRequest,
  RemoveMemberFromPartyRequest,
  SwapMembersRequest
} from '../../services/groupPartyApi';
import { globalClassesManager } from '../../services/GlobalClassesManager';

const { Title, Text } = Typography;
const { Option } = Select;

// Drag type definitions
const ItemTypes = {
  MEMBER: 'member',
};

// Member card component
interface MemberCardProps {
  member: any;
  isInParty?: boolean;
  onRemove?: () => void;
  getClassColor?: (className: string) => string;
  showClassText?: boolean;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, isInParty = false, onRemove, getClassColor, showClassText = true }) => {
  const { t } = useTranslation();
  const { canUpdate } = usePermissions();
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.MEMBER,
    item: { member },
    canDrag: () => canUpdate('parties'),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [member, canUpdate]); // Ensure re-initialization when member data changes

  // Get class background color
  const classBackgroundColor = getClassColor ? getClassColor(member.class || '') : '#f0f0f040';

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        padding: '8px',
        margin: '4px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        backgroundColor: classBackgroundColor,
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative'
      }}
    >
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px' }}>
          <img 
            src={`/images/classes/${member.class || t('groupParty.positions.unknown')}.webp`}
            alt={member.class || t('groupParty.positions.unknown')}
            style={{
              width: '26px',
              height: '26px',
              objectFit: 'contain',
              flexShrink: 0
            }}
            onError={(e) => {
              // If icon loading fails, hide image element
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span>{member.name}</span>
          {showClassText && (
            <>
              <span style={{
                color: '#666',
                fontSize: '10px',
                fontWeight: 'normal'
              }}>
                ({member.class || t('groupParty.positions.unknown')})
              </span>
            </>
          )}
        </div>
      </div>
      {member.partyDic && Object.values(member.partyDic).some((party: any) => party.isPartyLeader) && (
        <CrownOutlined style={{ color: '#faad14', position: 'absolute', top: '4px', right: '4px' }} />
      )}
      {isInParty && onRemove && canUpdate('parties') && (
        <Button
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={onRemove}
          style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '10px' }}
        />
      )}
    </div>
  );
};

// Party slot component
interface PartySlotProps {
  member?: any;
  partyId: string;
  slotIndex: number;
  isLeaderSlot?: boolean;
  hasLeader?: boolean;
  onDropMember: (member: any, partyId: string, slotIndex: number) => void;
  onRemoveMember: (memberId: number, partyId: string) => void;
  getClassColor: (className: string) => string;
  editMode: boolean;
  showClassText?: boolean;
}

// Draggable member component
interface DraggableMemberProps {
  member: any;
  partyId: string;
  slotIndex: number;
  isLeaderSlot: boolean;
  onRemoveMember: (memberId: number, partyId: string) => void;
  getClassColor: (className: string) => string;
  editMode: boolean;
  showClassText?: boolean;
}

// Custom drag preview component
interface DragPreviewProps {
  member: any;
  isLeaderSlot: boolean;
  getClassColor: (className: string) => string;
}

const DragPreview: React.FC<DragPreviewProps> = ({ member, isLeaderSlot, getClassColor }) => {
  const { t } = useTranslation();
  console.log(`🎯 Drag preview showing member:`, { name: member.name, id: member.id, isLeaderSlot });
  
  return (
    <div style={{
      width: '120px',
      height: '40px',
      backgroundColor: getClassColor(member.class || ''),
      border: `2px solid ${isLeaderSlot ? '#faad14' : '#52c41a'}`,
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#fff',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      {isLeaderSlot && (
        <TeamOutlined style={{ 
          position: 'absolute', 
          top: '2px', 
          left: '2px', 
          fontSize: '10px', 
          color: '#faad14',
          zIndex: 1
        }} />
      )}
      <span style={{
         backgroundColor: 'rgba(255,255,255,0.9)',
         color: 'black',
         padding: '4px 8px',
         borderRadius: '4px',
         fontSize: '12px',
         fontWeight: 'bold',
         display: 'inline-flex',
         alignItems: 'center',
         gap: '4px',
         width: 'fit-content'
       }}>
         <img 
           src={`/images/classes/${member.class || t('groupParty.positions.unknown')}.webp`}
           alt={member.class || t('groupParty.positions.unknown')}
           style={{
             width: '26px',
             height: '26px',
             objectFit: 'contain'
           }}
           onError={(e) => {
             // If icon loading fails, show default icon
             (e.target as HTMLImageElement).style.display = 'none';
           }}
         />
         {member.name}
       </span>
    </div>
  );
};

// Custom drag layer component
interface CustomDragLayerProps {
  getClassColor: (className: string) => string;
}

const CustomDragLayer: React.FC<CustomDragLayerProps> = ({ getClassColor }) => {
  const {
    itemType,
    isDragging,
    item,
    initialOffset,
    currentOffset,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || itemType !== ItemTypes.MEMBER) {
    return null;
  }

  const layerStyles: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 100,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  };

  // const getItemStyles = (currentOffset: any) => {
  //   if (!currentOffset) {
  //     return {
  //       display: 'none',
  //     };
  //   }

  //   const { x, y } = currentOffset;
  //   const transform = `translate(${x}px, ${y}px)`;
  //   return {
  //     transform,
  //     WebkitTransform: transform,
  //   };
  // };

  // console.log(`🎯 CustomDragLayer item:`, { 
  //   member: item.member?.name, 
  //   memberId: item.member?.id,
  //   sourceSlotIndex: item.sourceSlotIndex,
  //   isLeaderSlot: item.sourceSlotIndex === 0
  // });

  return (
    <div style={layerStyles}>
      {/* <div style={getItemStyles(currentOffset)}>
        <DragPreview
          member={item.member}
          isLeaderSlot={item.sourceSlotIndex === 0}
          getClassColor={getClassColor}
        />
      </div> */}
    </div>
  );
};

const DraggableMember: React.FC<DraggableMemberProps> = ({ member, partyId, slotIndex, isLeaderSlot, onRemoveMember, getClassColor, editMode, showClassText = true }) => {
  const { t } = useTranslation();
  const { canUpdate } = usePermissions();
  console.log(`🎯 DraggableMember setup:`, { 
    memberName: member.name, 
    memberId: member.id, 
    slotIndex, 
    isLeaderSlot 
  });
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.MEMBER,
    item: { 
      member, 
      sourcePartyId: partyId, 
      sourceSlotIndex: slotIndex 
    },
    canDrag: () => canUpdate('parties'),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [member, partyId, slotIndex, canUpdate]); // Dependency array ensures re-initialization when data changes

  return (
    <div
      ref={drag}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        cursor: 'move',
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
        paddingLeft: '4px'
      }}
    >
      <div style={{
        fontSize: '16px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        textAlign: 'left',
        paddingLeft: "12px",
        color: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '3px'
      }}>
        <img 
          src={`/images/classes/${member.class || t('groupParty.positions.unknown')}.webp`}
          alt={member.class || t('groupParty.positions.unknown')}
          style={{
            width: '26px',
            height: '26px',
            objectFit: 'contain',
            flexShrink: 0
          }}
          onError={(e) => {
            // If icon loading fails, hide icon
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span style={{ fontWeight: 'bold' }}>{member.name}</span>
        {showClassText && (
          <span style={{ fontWeight: 'normal' }}> ({member.class || t('groupParty.positions.unknown')})</span>
        )}
      </div>
      {editMode && canUpdate('parties') && (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onRemoveMember(member.id || 0, partyId);
          }}
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '14px',
            height: '14px',
            fontSize: '12px',
            padding: 0,
            minWidth: 'auto',
            opacity: 0.7
          }}
        />
      )}
    </div>
  );
};

const PartySlot: React.FC<PartySlotProps> = ({ member, partyId, slotIndex, isLeaderSlot = false, hasLeader = false, onDropMember, onRemoveMember, getClassColor, editMode, showClassText = true }) => {
  const { t } = useTranslation();
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.MEMBER,
    drop: (item: { member: any; sourcePartyId?: string; sourceSlotIndex?: number }) => {
      onDropMember(item.member, partyId, slotIndex);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [onDropMember, partyId, slotIndex]); // Dependency array ensures re-initialization when data changes

  return (
    <div
      ref={drop}
      style={{
        height:'60px',
        border: '1px dashed #d9d9d9',
        borderRadius: '4px',
        backgroundColor: isOver ? '#f0f8ff' : member ? getClassColor(member.class || '') : (isLeaderSlot && !hasLeader ? '#fffbe6' : '#fafafa'),
        borderColor: isOver ? '#1890ff' : member ? (isLeaderSlot ? '#faad14' : '#52c41a') : (isLeaderSlot && !hasLeader ? '#faad14' : '#d9d9d9'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        fontSize: '12px'
      }}
    >
      {isLeaderSlot && (
        <CrownOutlined style={{ 
          position: 'absolute', 
          top: '2px', 
          left: '2px', 
          fontSize: '14px', 
          color: '#faad14',
          zIndex: 1
        }} />
      )}
      {member ? (
        <DraggableMember
          member={member}
          partyId={partyId}
          slotIndex={slotIndex}
          isLeaderSlot={isLeaderSlot}
          onRemoveMember={onRemoveMember}
          getClassColor={getClassColor}
          editMode={editMode}
          showClassText={showClassText}
        />
      ) : (
        <Text type="secondary" style={{ 
          fontSize: '12px', 
          fontWeight: 'bold',
          opacity: 0.4,
          color: '#bbb'
        }}>
          {isLeaderSlot ? t('groupParty.positions.leader') : t('groupParty.positions.empty')}
        </Text>
      )}
    </div>
  );
};

const GroupPartyManager: React.FC = () => {
  const { t } = useTranslation();
  const { members, fetchMembers } = useGuildMembers();
  const { canCreate, canDelete, canUpdate } = usePermissions();
  
  // State management
  const [parties, setParties] = useState<PartyWithMembers[]>([]);
  const [unassignedMembers, setUnassignedMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<{id: string, name: string, color?: string}[]>([]);
  const [activeTab, setActiveTab] = useState('kvm');
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined);
  // Edit mode switch - read initial state from localStorage
  const [editMode, setEditMode] = useState(() => {
    const saved = localStorage.getItem('groupParty_editMode');
    return saved !== null ? JSON.parse(saved) : false;
  });
  
  // Class text display switch - read initial state from localStorage
  const [showClassText, setShowClassText] = useState(() => {
    const saved = localStorage.getItem('groupParty_showClassText');
    return saved !== null ? JSON.parse(saved) : false;
  });
  
  // Save to localStorage when editMode changes
  useEffect(() => {
    localStorage.setItem('groupParty_editMode', JSON.stringify(editMode));
  }, [editMode]);
  
  // Save to localStorage when showClassText changes
  useEffect(() => {
    localStorage.setItem('groupParty_showClassText', JSON.stringify(showClassText));
  }, [showClassText]);
  
  // Modal state
  const [partyModalVisible, setPartyModalVisible] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  
  // Form instance
  const [partyForm] = Form.useForm();

  // Load data 
  const loadData = async () => {
    if (loading) {
      console.log('🔄 loadData already in progress, skipping');
      return;
    }
    
    setLoading(true);
    try {
      const partyType = getPartyTypeFromTab(activeTab);
      console.log(`🔄 Starting to load data, current tab: ${activeTab}, party type: ${partyType}`);
      
      const [partiesResponse, unassignedResponse] = await Promise.all([
        groupPartyApi.parties.getAll(partyType),
        groupPartyApi.members.getUnassigned(partyType)
      ]);
      
      console.log(`📊 API response status:`);
      console.log(`  parties API: success=${partiesResponse.success}, data length=${partiesResponse.data?.length || 0}`);
      console.log(`  unassigned API: success=${unassignedResponse.success}, data length=${unassignedResponse.data?.length || 0}`);
      
      if (partiesResponse.success) {
        const partiesData = partiesResponse.data || [];
        console.log(`✅ Successfully retrieved ${partiesData.length} parties`);
        console.log(`📋 Party details:`, partiesData.map(p => ({ id: p.id, name: p.name, type: p.type, memberCount: p.members?.length || 0 })));
        setParties(partiesData);
      } else {
        console.error(`❌ Failed to get party data:`, partiesResponse.error);
        message.error(`Failed to get party data: ${partiesResponse.error || 'Unknown error'}`);
      }
      
      if (unassignedResponse.success) {
        setUnassignedMembers(unassignedResponse.data || []);
        console.log(`✅ Successfully retrieved ${unassignedResponse.data?.length || 0} unassigned members`);
      } else {
        console.warn(`⚠️ Failed to get unassigned members, using local data as fallback:`, unassignedResponse.error);
        // If API is unavailable, use local data as fallback
        const filteredMembers = members.filter(member => {
          if (!member.partyDic) return true;
          return !member.partyDic[partyType];
        });
        setUnassignedMembers(filteredMembers);
      }
    } catch (error) {
      console.error('❌ Exception occurred while loading data:', error);
      message.error('Failed to load data, please check network connection');
      
      // When exception occurs, don't clear existing party data, only handle unassigned members
      const partyType = getPartyTypeFromTab(activeTab);
      const filteredMembers = members.filter(member => {
        if (!member.partyDic) return true;
        return !member.partyDic[partyType];
      });
      setUnassignedMembers(filteredMembers);
    } finally {
      setLoading(false);
    }
  };

  // Load classes from cache when component mounts
  useEffect(() => {
    // Get classes from cache (will auto-load if not cached)
    globalClassesManager.getClasses().then(classesData => {
      setClasses(classesData);
    });

    // Also set up a listener for future updates
    const handleClassesUpdate = (classesData: typeof classes) => {
      setClasses(classesData);
    };
    
    globalClassesManager.addListener(handleClassesUpdate);
    
    // Cleanup listener on unmount
    return () => {
      globalClassesManager.removeListener(handleClassesUpdate);
    };
  }, []);

  // Load data when activeTab changes or members are available
  useEffect(() => {
    if (members.length > 0) {
      loadData();
    }
  }, [members.length, activeTab]); // Use members.length instead of members array

  // Get all class options
  const classOptions = useMemo(() => {
    const memberClasses = Array.from(new Set(unassignedMembers.map(member => member.class).filter(Boolean)));
    return memberClasses.map(cls => ({ label: cls, value: cls }));
  }, [unassignedMembers]);

  // Filtered member list
  const filteredUnassignedMembers = useMemo(() => {
    if (!selectedClass) {
      return unassignedMembers;
    }
    return unassignedMembers.filter(member => member.class === selectedClass);
  }, [unassignedMembers, selectedClass]);

  // Handle tab switching
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // Convert tab key to party type
  const getPartyTypeFromTab = (tabKey: string) => {
    switch (tabKey) {
      case 'kvm':
        return 'kvm';
      case 'gvg':
        return 'gvg';
      default:
        return tabKey;
    }
  };

  // Get color by class name
  const getClassColor = (className: string) => {
    const classInfo = classes.find(c => c.name === className);
    const color = classInfo?.color || '#f0f0f0'; // Default light gray
    // Convert color to lighter background color
    return color + '40'; // Add transparency
  };

  // Drag and drop handler
  const handleDropMember = useCallback(async (member: any, partyId: string, slotIndex: number) => {
    try {
      // Check if dragging to leader position (slotIndex === 0)
      const isLeaderSlot = slotIndex === 0;
      const currentPartyType = getPartyTypeFromTab(activeTab);
      
      console.log(`🚀 Starting drag operation: ${member.name} -> Party[${slotIndex}] (party type: ${currentPartyType})`);
      
      // Get target position member info
      const targetParty = parties.find(p => p.id === partyId);
      let targetMember = null;
      
      if (targetParty?.memberIds?.[slotIndex] && 
          targetParty.memberIds[slotIndex] !== 0) {
        
        const targetMemberId = targetParty.memberIds[slotIndex];
        // Prioritize searching from current party's members
        targetMember = targetParty.members?.find(m => m.id === targetMemberId);
        
        // If not found in party members, search from all members (handle data sync issues)
        if (!targetMember) {
          targetMember = members.find(m => m.id === targetMemberId);
          console.log(`⚠️ Target member not in party members, found from all members:`, targetMember?.name);
        }
      }
      
      // Get source position info - only search in current party type
      const currentTypeParties = parties.filter(p => p.type === currentPartyType);
      let sourceParty = currentTypeParties.find(p => p.members?.some(m => m.id === member.id));
      let sourcePartyId = sourceParty?.id;
      let sourceSlotIndex = sourceParty?.memberIds?.findIndex(id => id === member.id);
      
      // If not found in members, try searching from memberIds (handle data sync issues)
      if (!sourceParty || sourceSlotIndex === -1) {
        for (const party of currentTypeParties) {
          const memberIdIndex = party.memberIds?.findIndex(id => id === member.id);
          if (memberIdIndex !== undefined && memberIdIndex >= 0) {
            sourceParty = party;
            sourcePartyId = party.id;
            sourceSlotIndex = memberIdIndex;
            console.log(`⚠️ Found member position in memberIds, members data may not be synced`);
            break;
          }
        }
      }
      
      console.log(`🔍 Source position search details:`);
      console.log(`  Searching for member ${member.name} (ID: ${member.id}) in parties`);
      console.log(`  Found source party: ${sourceParty?.name || 'Not found'} (ID: ${sourcePartyId || 'None'})`);
      console.log(`  Source party memberIds:`, sourceParty?.memberIds);
      console.log(`  Source party members:`, sourceParty?.members?.map(m => `${m.name}(${m.id})`));
      console.log(`  Position in memberIds: ${sourceSlotIndex}`);
      
      // If source position not found, may be data sync issue, force refresh search
      if (!sourceParty || sourceSlotIndex === -1) {
        console.log(`⚠️ Source position search failed, trying to force refresh data`);
        console.log(`  Current parties count: ${parties.length}`);
        console.log(`  All parties members:`, parties.map(p => ({
          name: p.name,
          memberIds: p.memberIds,
          memberNames: p.members?.map(m => m.name)
        })));
      }
      
      console.log(`🔄 Drag analysis:`);
      console.log(`  Dragging member: ${member.name} (ID: ${member.id})`);
      console.log(`  Target position: Party(${partyId})[${slotIndex}]`);
      console.log(`  Target party memberIds:`, targetParty?.memberIds);
      console.log(`  Target position ID: ${targetParty?.memberIds?.[slotIndex]}`);
      console.log(`  Target member: ${targetMember?.name || 'None'} (ID: ${targetMember?.id || 'None'})`);
      console.log(`  Source party: ${sourcePartyId || 'None'} [${sourceSlotIndex}]`);
      console.log(`  Same party: ${sourcePartyId === partyId}`);
      console.log(`  Same member: ${member.id?.toString() === targetMember?.id?.toString()}`);
      
      // Check if it's intra-party movement
      const isSameParty = sourcePartyId === partyId;
      const isSameMember = targetMember && member.id === targetMember.id;
      
      if (isSameParty) {
        if (isSameMember || sourceSlotIndex === slotIndex) {
          console.log(`🔄 Detected same member dragged to own position, skipping operation`);
          console.log(`  Same member: ${isSameMember}, Same position: ${sourceSlotIndex === slotIndex}`);
          message.info(`${member.name} ${t('groupParty.messages.alreadyInPosition')}`);
          return;
        } else if (!targetMember) {
          // Intra-party movement to empty position
          console.log(`🔄 Detected intra-party movement to empty position, using intra-party movement logic`);
          const assignData: AssignMemberToPartyRequest = {
            memberId: member.id || 0,
            partyId: partyId,
            partyType: currentPartyType,
            isLeader: isLeaderSlot,
            slotIndex: slotIndex
          };
          
          console.log(`🔄 Intra-party movement request data:`, assignData);
          
          const response = await groupPartyApi.members.assignToParty(assignData);
          
          if (response.success) {
            const roleText = isLeaderSlot ? 'Leader' : 'Member';
            message.success(`${member.name} ${t('groupParty.messages.movedToPosition')}`);
            console.log(`✅ Intra-party movement successful, reloading data`);
            await Promise.all([loadData(), fetchMembers()]);
          } else {
            message.error(response.error || t('groupParty.messages.moveError'));
            console.error(`❌ Intra-party movement failed:`, response.error);
          }
          return;
        } else {
          // Intra-party movement to occupied position, should use swap logic
          console.log(`🔄 Detected intra-party movement to occupied position, using swap logic`);
          // Continue with swap logic below, don't return
        }
      }
      
      // If target position has a member and it's not the same member, need to swap
      if (targetMember && sourcePartyId && sourceSlotIndex !== undefined && sourceSlotIndex >= 0) {
        console.log(`🔄 Executing swap operation`);
      } else if (targetMember && (!sourcePartyId || sourceSlotIndex === undefined || sourceSlotIndex < 0)) {
        console.log(`⚠️ Target position has member but source position not found, possible data sync issue`);
        console.log(`  Force reload data and retry`);
        await Promise.all([loadData(), fetchMembers()]);
        message.warning(t('groupParty.messages.syncInProgress'));
        return;
      }
      
      if (targetMember && sourcePartyId && sourceSlotIndex !== undefined && sourceSlotIndex >= 0) {
        console.log(`🔄 Executing swap operation`);
        
        // Use new swap API
        const swapData: SwapMembersRequest = {
          member1Id: member.id || 0,
          member1PartyId: sourcePartyId,
          member1SlotIndex: sourceSlotIndex,
          member2Id: targetMember.id || 0,
          member2PartyId: partyId,
          member2SlotIndex: slotIndex,
          partyType: currentPartyType
        };
        
        console.log(`🔄 Swap request data:`, swapData);
        
        const response = await groupPartyApi.members.swapMembers(swapData);
        
        if (response.success) {
          message.success(`${member.name} ${t('groupParty.messages.swappedPositions')} ${targetMember.name}`);
          console.log(`✅ Swap successful, reloading data`);
          await Promise.all([loadData(), fetchMembers()]);
          
          // Force re-render to clear drag cache
          setTimeout(() => {
            console.log(`🔄 Force re-render to clear drag cache`);
          }, 100);
        } else {
          message.error(response.error || t('groupParty.messages.swapError'));
          console.error(`❌ Swap failed:`, response.error);
        }
      } else {
        console.log(`🔄 Executing normal assignment operation`);
        
        // Normal assignment - first check if member is already in another party
        if (sourcePartyId && sourceSlotIndex !== undefined) {
          console.log(`🔄 Member already in party, removing first: ${sourcePartyId}[${sourceSlotIndex}]`);
          
          // Member already in another party, remove first then assign
          const removeData: RemoveMemberFromPartyRequest = {
            memberId: member.id || 0,
            partyId: sourcePartyId,
            partyType: currentPartyType
          };
          
          const removeResponse = await groupPartyApi.members.removeFromParty(removeData);
          if (!removeResponse.success) {
            message.error(removeResponse.error || 'Failed to remove member');
            console.error(`❌ Remove failed:`, removeResponse.error);
            return;
          }
          console.log(`✅ Member removed successfully`);
        }
        
        const assignData: AssignMemberToPartyRequest = {
          memberId: member.id || 0,
          partyId: partyId,
          partyType: currentPartyType,
          isLeader: isLeaderSlot,
          slotIndex: slotIndex // Specify the position to assign to
        };
        
        console.log(`🔄 Assignment request data:`, assignData);
        
        const response = await groupPartyApi.members.assignToParty(assignData);
        
        if (response.success) {
          const roleText = isLeaderSlot ? 'Leader' : 'Member';
          message.success(`${member.name} ${t('groupParty.messages.setAsPosition')}`);
          console.log(`✅ Assignment successful, reloading data`);
          // Reload party data and guild member data
          await Promise.all([loadData(), fetchMembers()]);
        } else {
          message.error(response.error || t('groupParty.messages.assignError'));
          console.error(`❌ Assignment failed:`, response.error);
        }
      }
    } catch (error) {
      message.error(t('groupParty.messages.assignError'));
      console.error('Failed to assign member:', error);
    }
  }, [parties, activeTab]);

  // Remove member
  const handleRemoveMember = useCallback(async (memberId: number, partyId: string) => {
    try {
      const currentPartyType = getPartyTypeFromTab(activeTab);
      const removeData: RemoveMemberFromPartyRequest = {
        memberId: memberId,
        partyId: partyId,
        partyType: currentPartyType
      };
      
      const response = await groupPartyApi.members.removeFromParty(removeData);
      
      if (response.success) {
        message.success(t('groupParty.messages.memberRemoved'));
        // Reload party data and guild member data
        await Promise.all([loadData(), fetchMembers()]);
      } else {
        message.error(response.error || 'Failed to remove member');
      }
    } catch (error) {
      message.error(t('groupParty.messages.removeError'));
      console.error('Failed to remove member:', error);
    }
  }, [activeTab]);



  // Commented out auto-create default parties logic
  // useEffect(() => {
  //   if (parties.length === 0 && !loading) {
  //     createDefaultParties();
  //   }
  // }, [parties.length, loading, createDefaultParties]);

  // Create/edit party
  const handleCreateParty = async (values: CreatePartyRequest) => {
    try {
      const response = editingParty 
        ? await groupPartyApi.parties.update(editingParty.id, values)
        : await groupPartyApi.parties.create(values);
      
      if (response.success) {
        message.success(editingParty ? t('groupParty.messages.partyUpdated') : t('groupParty.messages.partyCreated'));
        setPartyModalVisible(false);
        partyForm.resetFields();
        setEditingParty(null);
        loadData();
      } else {
        message.error(response.error || 'Operation failed');
      }
    } catch (error) {
      message.error(editingParty ? 'Failed to update party' : 'Failed to create party');
      console.error('Failed to operate party:', error);
    }
  };

  // Delete party
  const handleDeleteParty = async (partyId: string) => {
    try {
      const response = await groupPartyApi.parties.delete(partyId);
      
      if (response.success) {
        message.success(t('groupParty.messages.partyDeleted'));
        loadData();
      } else {
        message.error(response.error || t('groupParty.messages.deleteError'));
      }
    } catch (error) {
      message.error(t('groupParty.messages.deleteError'));
      console.error('Failed to delete party:', error);
    }
  };

  // Set leader
  const handleSetLeader = async (memberId: number, partyId: string) => {
    try {
      const currentPartyType = getPartyTypeFromTab(activeTab);
      const assignData: AssignMemberToPartyRequest = {
        memberId: memberId,
        partyId: partyId,
        partyType: currentPartyType,
        isLeader: true
      };
      
      const response = await groupPartyApi.members.assignToParty(assignData);
      
      if (response.success) {
        message.success(t('groupParty.messages.leaderSet'));
        loadData();
      } else {
        message.error(response.error || t('groupParty.messages.setLeaderError'));
      }
    } catch (error) {
      message.error(t('groupParty.messages.setLeaderError'));
      console.error('Failed to set leader:', error);
    }
  };

  // Clear all parties
  const handleClearAllParties = async () => {
    Modal.confirm({
      title: t('groupParty.actions.clearAll'),
      content: t('groupParty.actions.clearAllConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const response = await groupPartyApi.members.clearAllParties();
          
          if (response.success) {
            message.success(t('groupParty.messages.allPartiesCleared'));
            loadData();
          } else {
            message.error(response.error || t('groupParty.messages.clearError'));
          }
        } catch (error) {
          message.error(t('groupParty.messages.clearError'));
          console.error('Failed to clear parties:', error);
        }
      }
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <CustomDragLayer getClassColor={getClassColor} />
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '16px' }}>
        {/* Title and action bar */}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Title level={3} style={{ margin: 0 }}>
              <UsergroupAddOutlined style={{ marginRight: '8px' }} />
              {t('groupParty.title')}
            </Title>
            {/* Edit mode switch */}
            <Space>
              <span style={{ fontSize: '14px', color: '#666' }}>{t('groupParty.editMode')}:</span>
              <Switch 
                 checked={editMode}
                 onChange={canUpdate('parties') ? setEditMode : undefined}
                 disabled={!canUpdate('parties')}
                 size="small"
               />
            </Space>
            {/* Class text display switch */}
            <Space>
              <span style={{ fontSize: '14px', color: '#666' }}>{t('groupParty.showClassText')}:</span>
              <Switch 
                 checked={showClassText}
                 onChange={setShowClassText}
                 size="small"
                 title={showClassText ? t('groupParty.showClassTextOn') : t('groupParty.showClassTextOff')}
               />
            </Space>
          </div>
          {editMode && (
            <Space>
              {canCreate('parties') && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingParty(null);
                    partyForm.resetFields();
                    setPartyModalVisible(true);
                  }}
                >
                  {t('groupParty.createEditModal.createTitle')}
                </Button>
              )}
              {canDelete('parties') && (
                <Button 
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleClearAllParties}
                >
                  {t('groupParty.actions.clearAll')}
                </Button>
              )}
            </Space>
          )}
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
          {/* Left side party configuration area */}
          <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Display by party type tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              size="large"
              style={{ height: '100%' }}
              items={[
                {
                  key: 'kvm',
                  label: (
                    <span>
                      <TeamOutlined style={{ marginRight: '8px' }} />
                      {t('groupParty.tabs.kvm')}
                    </span>
                  ),
                  children: (
                    <div style={{ height: 'calc(100vh - 270px)', overflow: 'auto' }}>
                      {(() => {
                        const kvmParties = parties.filter(party => party.type === 'kvm');
                        if (kvmParties.length === 0) {
                          return (
                            <Empty 
                               description={t('groupParty.empty.kvmParties')} 
                               style={{ marginTop: '50px' }} 
                             />
                          );
                        }
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
                            {kvmParties.map((party) => (
                              <Card 
                                key={party.id}
                                title={
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                                    <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{party.name}</span>
                                    {editMode && (
                                      <Space size={2}>
                                        {canUpdate('parties') && (
                                          <Button 
                                            type="text" 
                                            size="small" 
                                            icon={<EditOutlined style={{ fontSize: '10px' }} />}
                                            onClick={() => {
                                              setEditingParty(party);
                                              partyForm.setFieldsValue(party);
                                              setPartyModalVisible(true);
                                            }}
                                            style={{ padding: '2px', minWidth: '20px', height: '20px' }}
                                          />
                                        )}
                                        {canDelete('parties') && (
                                          <Button 
                                            type="text" 
                                            size="small" 
                                            danger
                                            icon={<DeleteOutlined style={{ fontSize: '10px' }} />}
                                            onClick={() => handleDeleteParty(party.id)}
                                            style={{ padding: '2px', minWidth: '20px', height: '20px' }}
                                          />
                                        )}
                                      </Space>
                                    )}
                                  </div>
                                }
                                size="small"
                                style={{ height: '240px', minWidth: '120px' }}
                                bodyStyle={{ padding: '4px', height: 'calc(100% - 40px)', overflow: 'hidden' }}
                                headStyle={{ padding: '4px 8px', minHeight: '40px' }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', height: '100%' }}>
                                  {[0, 1, 2, 3, 4].map(slotIndex => {
                                    const isLeaderSlot = slotIndex === 0;
                                    let member;
                                    let leaderMember;
                                    
                                    // Get member based on position in memberIds array
                                    if (party.memberIds && party.memberIds[slotIndex]) {
                                      const memberId = party.memberIds[slotIndex];
                                      // If memberIds[slotIndex] is not 0 (empty slot), find corresponding member
                                      if (memberId !== 0) {
                                        member = party.members?.find(m => m.id === memberId);
                                      }
                                    }
                                    
                                    // Check if leader position has member
                                    if (party.memberIds && party.memberIds[0]) {
                                      const leaderMemberId = party.memberIds[0];
                                      if (leaderMemberId !== 0) {
                                        leaderMember = party.members?.find(m => m.id === leaderMemberId);
                                      }
                                    }
                                    
                                    return (
                                      <PartySlot
                                        key={`${party.id}-${slotIndex}-${member?.id || 'empty'}`}
                                        member={member}
                                        partyId={party.id}
                                        slotIndex={slotIndex}
                                        isLeaderSlot={isLeaderSlot}
                                        hasLeader={!!leaderMember}
                                        onDropMember={handleDropMember}
                                        onRemoveMember={handleRemoveMember}
                                        getClassColor={getClassColor}
                                        editMode={editMode}
                                        showClassText={showClassText}
                                      />
                                    );
                                  })}
                                </div>
                              </Card>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )
                },
                {
                  key: 'gvg',
                  label: (
                    <span>
                      <TeamOutlined style={{ marginRight: '8px' }} />
                      {t('groupParty.tabs.gvg')}
                    </span>
                  ),
                  children: (
                    <div style={{ height: 'calc(100vh - 270px)', overflow: 'auto' }}>
                      {(() => {
                        const gvgParties = parties.filter(party => party.type === 'gvg');
                        if (gvgParties.length === 0) {
                          return (
                            <Empty 
                               description={t('groupParty.empty.gvgParties')} 
                               style={{ marginTop: '50px' }} 
                             />
                          );
                        }
                        // Group GVG parties by 3
                        const partyGroups = [];
                        for (let i = 0; i < gvgParties.length; i += 3) {
                          partyGroups.push(gvgParties.slice(i, i + 3));
                        }
                        
                        // Group teams by 2 for displaying 2 teams per row
                        const teamRows = [];
                        for (let i = 0; i < partyGroups.length; i += 3) {
                          teamRows.push(partyGroups.slice(i, i + 3));
                        }
                        
                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {teamRows.map((teamRow, rowIndex) => {
                              return (
                              <div key={`row-${rowIndex}`} style={{ flex: 1, gap: '12px' }}>
                                {/* TEAM title */}
                                <div style={{ 
                                  marginBottom: '8px', 
                                  padding: '8px 8px', 
                                  backgroundColor: 'rgba(119, 169, 222, 1)', 
                                  color: 'white', 
                                  borderRadius: '6px', 
                                  fontWeight: 'bold', 
                                  fontSize: '22px',
                                  textAlign: 'center'
                                }}>
                                  TEAM {rowIndex + 1}
                                
                                <div style={{marginTop:"8px", display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '8px' }}>
                                  {teamRow.map((teamGroup, teamIndex) => {
                                  const actualTeamIndex = rowIndex * 3 + teamIndex;
                                  return (
                                    <div key={`team-${actualTeamIndex}`} style={{ flex: 1 }}>
                                      {/* Team title */}
                                      <div style={{ 
                                        marginBottom: '8px', 
                                        padding: '8px 8px', 
                                        backgroundColor: 'rgba(128, 128, 128, 1)', 
                                        color: 'white', 
                                        borderRadius: '6px', 
                                        fontWeight: 'bold', 
                                        fontSize: '16px',
                                        textAlign: 'center'
                                      }}>
                                        PARTY {actualTeamIndex + 1} {actualTeamIndex === 0 || actualTeamIndex === 3 ? '(Main DPS)' : '(Defender)'}
                                      </div>
                                      {/* 3 parties of this team */}
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                        {teamGroup.map((party) => (
                                          <Card 
                                            key={party.id}
                                            title={
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                                                <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{party.name}</span>
                                                {editMode && (
                                                  <Space size={2}>
                                                    {canUpdate('parties') && (
                                                      <Button 
                                                        type="text" 
                                                        size="small" 
                                                        icon={<EditOutlined style={{ fontSize: '10px' }} />}
                                                        onClick={() => {
                                                          setEditingParty(party);
                                                          partyForm.setFieldsValue(party);
                                                          setPartyModalVisible(true);
                                                        }}
                                                        style={{ padding: '2px', minWidth: '20px', height: '20px' }}
                                                      />
                                                    )}
                                                    {canDelete('parties') && (
                                                      <Button 
                                                        type="text" 
                                                        size="small" 
                                                        danger
                                                        icon={<DeleteOutlined style={{ fontSize: '10px' }} />}
                                                        onClick={() => handleDeleteParty(party.id)}
                                                        style={{ padding: '2px', minWidth: '20px', height: '20px' }}
                                                      />
                                                    )}
                                                  </Space>
                                                )}
                                              </div>
                                            }
                                            size="small"
                                            style={{ height: '240px', minWidth: '120px' }}
                                            bodyStyle={{ padding: '4px', height: 'calc(100% - 40px)', overflow: 'hidden' }}
                                            headStyle={{ padding: '4px 8px', minHeight: '40px' }}
                                          >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', height: '100%' }}>
                                              {[0, 1, 2, 3, 4].map(slotIndex => {
                                                const isLeaderSlot = slotIndex === 0;
                                                let member;
                                                let leaderMember;
                                                
                                                // Get member based on position in memberIds array
                                                if (party.memberIds && party.memberIds[slotIndex]) {
                                                  const memberId = party.memberIds[slotIndex];
                                                  // If memberIds[slotIndex] is not 0 (empty slot), find the corresponding member
                                                  if (memberId !== 0) {
                                                    member = party.members?.find(m => m.id === memberId);
                                                  }
                                                }
                                                
                                                // Check if leader position has a member
                                                if (party.memberIds && party.memberIds[0]) {
                                                  const leaderMemberId = party.memberIds[0];
                                                  if (leaderMemberId !== 0) {
                                                    leaderMember = party.members?.find(m => m.id === leaderMemberId);
                                                  }
                                                }
                                                
                                                return (
                                                  <PartySlot
                                                    key={`${party.id}-${slotIndex}-${member?.id || 'empty'}`}
                                                    member={member}
                                                    partyId={party.id}
                                                    slotIndex={slotIndex}
                                                    isLeaderSlot={isLeaderSlot}
                                                    hasLeader={!!leaderMember}
                                                    onDropMember={handleDropMember}
                                                    onRemoveMember={handleRemoveMember}
                                                    getClassColor={getClassColor}
                                                    editMode={editMode}
                                                    showClassText={showClassText}
                                                  />
                                                );
                                              })}
                                            </div>
                                          </Card>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                  })}
                                </div>
                                </div>
                              </div>
                              );
                          })}
                          </div>
                        );
                      })()}
                    </div>
                  )
                }
              ]}
            />
          </div>

          {/* Right side member list */}
          <div style={{ width: '240px', backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 'calc(100vh - 180px)'  }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                {/* <Title level={4} style={{ margin: 0 }}>{t('groupParty.memberList.title')}</Title> */}
                <div style={{ fontSize: '16px' }}>
                  {selectedClass 
                    ? `${selectedClass}: ${filteredUnassignedMembers.length} ${t('groupParty.memberList.memberCount')}`
                     : `${t('common.total')}: ${filteredUnassignedMembers.length} ${t('groupParty.memberList.memberCount')}`
                  }
                </div>
              </div>
               <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>{t('groupParty.memberList.dragTip')}</Text>
              <Select
                placeholder={t('groupParty.memberList.classFilter')}
                allowClear
                style={{ width: '100%' }}
                value={selectedClass}
                onChange={setSelectedClass}
                options={[
                  { label: t('groupParty.memberList.allClasses'), value: undefined },
                  ...classOptions
                ]}
              />
            </div>
            <div style={{ padding: '8px', flex: 1, overflow: 'auto' }}>
              {filteredUnassignedMembers.length === 0 ? (
                <Empty description={selectedClass ? t('groupParty.memberList.emptyByClass', { className: selectedClass }) : t('groupParty.memberList.allAssigned')} style={{ marginTop: '50px' }} />
              ) : (
                filteredUnassignedMembers.map(member => (
                  <MemberCard key={member.id} member={member} getClassColor={getClassColor} showClassText={showClassText} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Create/Edit Party Modal */}
        <Modal
          title={editingParty ? t('groupParty.createEditModal.editTitle') : t('groupParty.createEditModal.createTitle')}
          open={partyModalVisible}
          onCancel={() => {
            setPartyModalVisible(false);
            setEditingParty(null);
            partyForm.resetFields();
          }}
          onOk={() => partyForm.submit()}
          okText={t('groupParty.createEditModal.confirm')}
          cancelText={t('groupParty.createEditModal.cancel')}
        >
          <Form
            form={partyForm}
            layout="vertical"
            onFinish={handleCreateParty}
          >
            <Form.Item
              name="name"
              label={t('groupParty.form.partyName')}
              rules={[{ required: true, message: t('groupParty.form.partyNameRequired') }]}
            >
              <Input placeholder={t('groupParty.form.partyNamePlaceholder')} />
            </Form.Item>
            <Form.Item
              name="type"
              label={t('groupParty.form.partyType')}
              rules={[{ required: true, message: t('groupParty.form.partyTypeRequired') }]}
              initialValue="kvm"
            >
              <Select placeholder={t('groupParty.form.partyTypePlaceholder')}>
                <Option value="kvm">{t('groupParty.tabs.kvm')}</Option>
                 <Option value="gvg">{t('groupParty.tabs.gvg')}</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="groupId"
              label={t('groupParty.form.group')}
            >
              <Input placeholder={t('groupParty.form.groupPlaceholder')} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DndProvider>
  );
};

export default GroupPartyManager;