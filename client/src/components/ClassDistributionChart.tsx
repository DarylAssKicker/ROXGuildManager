import React, { useMemo, useState, useEffect } from 'react';
import { Modal, Card, Row, Col, Progress, Table } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { GuildMember } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { classesApi } from '../services/api';

interface ClassDistributionChartProps {
  visible: boolean;
  onClose: () => void;
  members: GuildMember[];
}

const ClassDistributionChart: React.FC<ClassDistributionChartProps> = ({
  visible,
  onClose,
  members,
}) => {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<{id: string, name: string, color?: string}[]>([]);

  // Load class configuration
  const loadClasses = async () => {
    try {
      const response = await classesApi.getAll();
      setClasses(response.data.data || []);
    } catch (error) {
      console.error('Failed to load class configuration:', error);
    }
  };

  // Load class configuration when component mounts
  useEffect(() => {
    if (visible) {
      loadClasses();
    }
  }, [visible]);

  // Get color by class name
  const getClassColor = (className: string) => {
    const classInfo = classes.find(c => c.name === className);
    return classInfo?.color || '#8884d8'; // Default color
  };

  // Get pie chart color and handle light colors
  const getPieColor = (className: string) => {
    const color = getClassColor(className);
    return color;
  };

  // Get text color (based on background color brightness)
  const getTextColor = (className: string) => {
    const color = getClassColor(className);
    // Check background color brightness
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      // Use dark text for light backgrounds
      return brightness > 128 ? '#000000' : '#ffffff';
    }
    return '#ffffff'; // Default white text
  };

  // Calculate class distribution data
  const classDistribution = useMemo(() => {
    const classCount: Record<string, number> = {};
    
    members.forEach(member => {
      if (member.class) {
        classCount[member.class] = (classCount[member.class] || 0) + 1;
      }
    });

    const total = Object.values(classCount).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(classCount)
      .map(([className, count]) => ({
        name: className,
        value: count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.value - a.value);
  }, [members]);

  // Table column definitions
  const columns = [
    {
      title: t('common.class'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, _record: any, index: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img
            src={`/images/classes/${name}.webp`}
            alt={name}
            style={{
              width: 20,
              height: 20,
              objectFit: 'contain'
            }}
            onError={(e) => {
              // Show color dot as fallback if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = 'block';
              }
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: getClassColor(name),
              borderRadius: '50%',
              display: 'none' // Hidden by default, only shown when image fails to load
            }}
          />
          {name}
        </div>
      ),
    },
    {
      title: t('dataAnalysis.classStats.count'),
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => <strong>{value}</strong>,
    },
    {
      title: t('dataAnalysis.classStats.percentage'),
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage: string) => `${percentage}%`,
    },

  ];

  // Custom label component
  const CustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value, name, percentage } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 35; // Position 35px outside the pie chart
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    const classColor = getClassColor(name);
    const bgColor = classColor + '30'; // Add transparency as background color

    return (
      <g>
        {/* Background rectangle */}
        <rect
          x={x - 30}
          y={y - 12}
          width="60"
          height="24"
          fill={bgColor}
          stroke={classColor}
          strokeWidth="1"
          rx="12"
          ry="12"
        />
        {/* Class icon */}
        <image
          x={x - 25}
          y={y - 8}
          width="16"
          height="16"
          href={`/images/classes/${name}.webp`}
          onError={(e) => {
            // Hide image if loading fails
            e.currentTarget.style.display = 'none';
          }}
        />
        {/* Percentage text */}
        <text 
          x={x + 5} 
          y={y} 
          fill="#000000" 
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          fontWeight="500"
        >
          {percentage}%
        </text>
      </g>
    );
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '8px 12px', 
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.payload.name}</p>
          <p style={{ margin: 0, color: '#666' }}>
            {t('dataAnalysis.classStats.count')}: {data.value}
          </p>
          <p style={{ margin: 0, color: '#666' }}>
            {t('dataAnalysis.classStats.percentage')}: {data.payload.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const totalMembers = members.filter(member => member.class).length;

  return (
    <Modal
      title={t('dataAnalysis.classStats.title')}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1400}
      centered
      style={{ top: 10 }}
    >
      <style>
        {`
          .recharts-pie-label-text {
            fill: #000000 !important;
            font-size: 14px !important;
            stroke: #ffffff !important;
            stroke-width: 2px !important;
            paint-order: stroke fill !important;
          }
        `}
      </style>
      <div style={{ padding: '16px 0' }}>
        {/* Statistics overview */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <span style={{ fontSize: 16, fontWeight: 'bold' }}>
                {t('dataAnalysis.classStats.totalMembers')}: {totalMembers}
              </span>
            </Col>
            <Col>
              <span style={{ color: '#666' }}>
                {t('common.total')} {classDistribution.length} {t('dataAnalysis.classStats.classTypes')}
              </span>
            </Col>
          </Row>
        </Card>

        {classDistribution.length > 0 ? (
          <Row gutter={16}>
            {/* Pie chart */}
            <Col span={12}>
              <Card 
                title={t('dataAnalysis.classStats.pieChart')} 
                size="small"
                style={{ height: '700px' }}
                bodyStyle={{ 
                  height: 'calc(100% - 40px)', 
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px'
                }}
              >
                <ResponsiveContainer width="100%" height={600}>
                  <PieChart>
                    <Pie
                      data={classDistribution}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={<CustomLabel />}
                      outerRadius={160}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {classDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getPieColor(entry.name)}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={80}
                      formatter={(value) => value}
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* List view */}
            <Col span={12}>
              <Card 
                title={t('dataAnalysis.classStats.listView')} 
                size="small"
                style={{ height: '700px' }}
              >
                <Table
                  columns={columns}
                  dataSource={classDistribution}
                  rowKey="name"
                  pagination={false}
                  size="small"
                  scroll={{ y: 600 }}
                  rowClassName={(record) => {
                    // Add custom styles for each row
                    return 'class-distribution-row';
                  }}
                  onRow={(record) => ({
                     style: {
                       backgroundColor: getClassColor(record.name) + '20', // Add transparency
                     },
                   })}
                />
              </Card>
            </Col>
          </Row>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 0', 
            color: '#999' 
          }}>
            No class data available
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ClassDistributionChart;