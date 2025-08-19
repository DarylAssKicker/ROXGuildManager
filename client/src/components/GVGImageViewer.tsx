import React, { useState, useEffect } from 'react';
import { Modal, Image, List, Card, Typography, Button, message, Empty, Spin, Popconfirm } from 'antd';
import { EyeOutlined, DownloadOutlined, DeleteOutlined, FolderOutlined, AppstoreAddOutlined, PictureOutlined } from '@ant-design/icons';
import { gvgApi } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Text } = Typography;

interface GVGImageViewerProps {
  visible: boolean;
  onClose: () => void;
  date: string;
}

interface GVGImage {
  filename: string;
  path: string;
  size: number;
  created: string;
}

const GVGImageViewer: React.FC<GVGImageViewerProps> = ({ visible, onClose, date }) => {
  const { user } = useAuth();
  const [images, setImages] = useState<GVGImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [stitchLoading, setStitchLoading] = useState(false);
  const [stitchedImageVisible, setStitchedImageVisible] = useState(false);
  const [stitchedImageUrl, setStitchedImageUrl] = useState<string>('');

  // Load image list
  const loadImages = async () => {
    if (!date || !visible) return;
    
    try {
      setLoading(true);
      const response = await gvgApi.getImages(date);
      
      if (response.data.success) {
        setImages(response.data.data.images || []);
      } else {
        message.error(response.data.message || 'Failed to get image list');
      }
    } catch (error) {
      console.error('Failed to load GVG images:', error);
      message.error('Failed to load image list');
    } finally {
      setLoading(false);
    }
  };

  // Load images when modal opens or date changes
  useEffect(() => {
    if (visible && date) {
      loadImages();
    }
  }, [visible, date]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Download image
  const handleDownload = (image: GVGImage) => {
    const link = document.createElement('a');
    link.href = image.path;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(`Download started: ${image.filename}`);
  };

  // Delete image
  const handleDeleteImage = async (image: GVGImage) => {
    try {
      const response = await gvgApi.deleteImage(date, image.filename);
      
      if (response.data.success) {
        message.success(`Successfully deleted image: ${image.filename}`);
        // Remove from local state
        setImages(prevImages => prevImages.filter(img => img.filename !== image.filename));
      } else {
        message.error(response.data.message || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      message.error('Failed to delete image');
    }
  };

  // Stitch images
  const handleStitchImages = async () => {
    if (images.length === 0) {
      message.warning('No images to stitch');
      return;
    }

    try {
      setStitchLoading(true);
      
      // Create canvas to stitch images
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        message.error('Browser does not support Canvas');
        return;
      }

      const imageElements: HTMLImageElement[] = [];
      let totalHeight = 0;
      let maxWidth = 0;

      // Load all images
      await Promise.all(images.map((image, index) => {
        return new Promise<void>((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            imageElements[index] = img;
            totalHeight += img.height;
            maxWidth = Math.max(maxWidth, img.width);
            resolve(undefined);
          };
          img.onerror = reject;
          img.src = image.path;
        });
      }));

      // Set canvas dimensions
      canvas.width = maxWidth;
      canvas.height = totalHeight;

      // Draw all images on canvas
      let currentY = 0;
      imageElements.forEach((img) => {
        ctx.drawImage(img, 0, currentY);
        currentY += img.height;
      });

      // Convert to blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setStitchedImageUrl(url);
          setStitchedImageVisible(true);
        }
      }, 'image/png');

    } catch (error) {
      console.error('Failed to stitch images:', error);
      message.error('Failed to stitch images');
    } finally {
      setStitchLoading(false);
    }
  };

  // Download stitched image
  const handleDownloadStitched = () => {
    if (!stitchedImageUrl) return;
    
    const link = document.createElement('a');
    link.href = stitchedImageUrl;
    link.download = `gvg_stitched_${date}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Stitched image download started');
  };

  // Clean up resources when closing stitched image preview
  const handleCloseSitched = () => {
    setStitchedImageVisible(false);
    if (stitchedImageUrl) {
      URL.revokeObjectURL(stitchedImageUrl);
      setStitchedImageUrl('');
    }
  };

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (stitchedImageUrl) {
        URL.revokeObjectURL(stitchedImageUrl);
      }
    };
  }, [stitchedImageUrl]);

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PictureOutlined />
            <span>GVG Image Viewer - {dayjs(date).format('YYYY-MM-DD')}</span>
          </div>
        }
        open={visible}
        onCancel={onClose}
        width="90vw"
        style={{ top: 20 }}
        bodyStyle={{ height: '80vh', padding: '16px' }}
        footer={[
          <Button key="stitch" 
            type="primary" 
            icon={<AppstoreAddOutlined />}
            onClick={handleStitchImages}
            loading={stitchLoading}
            disabled={images.length === 0}
          >
            Stitch Images ({images.length} images)
          </Button>,
          <Button key="refresh" onClick={loadImages} loading={loading}>
            Refresh
          </Button>,
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        ]}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Statistics */}
          <Card size="small" style={{ marginBottom: 16, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <FolderOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  <Text strong>Image Count: </Text>
                  <Text style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>
                    {images.length} images
                  </Text>
                </div>
                <div>
                  <Text strong>Total Size: </Text>
                  <Text style={{ color: '#fa8c16', fontSize: '16px', fontWeight: 'bold' }}>
                    {formatFileSize(images.reduce((sum, img) => sum + img.size, 0))}
                  </Text>
                </div>
                <div>
                  <Text strong>Date: </Text>
                  <Text style={{ color: '#722ed1', fontSize: '16px', fontWeight: 'bold' }}>
                    {dayjs(date).format('YYYY-MM-DD')}
                  </Text>
                </div>
              </div>
              <Text type="secondary">Supports image preview, download and stitching</Text>
            </div>
          </Card>

          {/* Image List */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" />
              </div>
            ) : images.length > 0 ? (
              <List
                grid={{
                  gutter: 16,
                  xs: 1,
                  sm: 2,
                  md: 3,
                  lg: 4,
                  xl: 5,
                  xxl: 6,
                }}
                dataSource={images}
                renderItem={(image, index) => (
                  <List.Item>
                    <Card
                      hoverable
                      cover={
                        <div style={{ height: 200, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Image
                            alt={image.filename}
                            src={image.path}
                            preview={{
                              visible: false,
                            }}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '100%', 
                              objectFit: 'contain',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              setCurrentImage(image.path);
                              setCurrentImageIndex(index);
                              setPreviewVisible(true);
                            }}
                          />
                        </div>
                      }
                      actions={[
                        <Button
                          key="preview"
                          type="text"
                          icon={<EyeOutlined />}
                          onClick={() => {
                            setCurrentImage(image.path);
                            setCurrentImageIndex(index);
                            setPreviewVisible(true);
                          }}
                        >
                          Preview
                        </Button>,
                        <Button
                          key="download"
                          type="text"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownload(image)}
                        >
                          Download
                        </Button>,
                        ...(user?.role !== 'viewer' ? [
                          <Popconfirm
                            key="delete"
                            title="Delete Image"
                            description={`Are you sure you want to delete "${image.filename}"?`}
                            onConfirm={() => handleDeleteImage(image)}
                            okText="Delete"
                            cancelText="Cancel"
                            okType="danger"
                          >
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                            >
                              Delete
                            </Button>
                          </Popconfirm>
                        ] : [])
                      ]}
                    >
                      <Card.Meta
                        title={<Text ellipsis style={{ fontSize: '12px' }}>{image.filename}</Text>}
                        description={
                          <div>
                            <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                              Size: {formatFileSize(image.size)}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                              Time: {dayjs(image.created).format('HH:mm:ss')}
                            </Text>
                          </div>
                        }
                      />
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="No saved GVG images for this date" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Image.PreviewGroup
        preview={{
          visible: previewVisible,
          onVisibleChange: (visible) => setPreviewVisible(visible),
          current: currentImageIndex
        }}
      >
        {images.map((image) => (
          <Image key={image.filename} src={image.path} style={{ display: 'none' }} />
        ))}
      </Image.PreviewGroup>

      {/* Stitched Image Preview Modal */}
      <Modal
        title="Stitched Image Preview"
        open={stitchedImageVisible}
        onCancel={handleCloseSitched}
        width="90vw"
        style={{ top: 20 }}
        bodyStyle={{ 
          height: '80vh', 
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownloadStitched}>
            Download Stitched Image
          </Button>,
          <Button key="close" onClick={handleCloseSitched}>
            Close
          </Button>
        ]}
      >
        {stitchedImageUrl && (
          <Image
            src={stitchedImageUrl}
            alt="Stitched Image"
            style={{ maxWidth: '100%' }}
            preview={false}
          />
        )}
      </Modal>
    </>
  );
};

export default GVGImageViewer;