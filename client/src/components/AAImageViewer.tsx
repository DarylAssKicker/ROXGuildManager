import React, { useState, useEffect } from 'react';
import { Modal, Image, List, Card, Typography, Button, Space, message, Empty, Spin } from 'antd';
import { EyeOutlined, DownloadOutlined, DeleteOutlined, FolderOutlined, AppstoreAddOutlined, PictureOutlined } from '@ant-design/icons';
import { aaApi } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface AAImageViewerProps {
  visible: boolean;
  onClose: () => void;
  date: string;
}

interface AAImage {
  filename: string;
  path: string;
  size: number;
  created: string;
}

const AAImageViewer: React.FC<AAImageViewerProps> = ({ visible, onClose, date }) => {
  const { t } = useTranslation();
  const [images, setImages] = useState<AAImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [stitchLoading, setStitchLoading] = useState(false);
  const [stitchedImageVisible, setStitchedImageVisible] = useState(false);
  const [stitchedImageUrl, setStitchedImageUrl] = useState<string>('');

  // Load image list
  const loadImages = async () => {
    if (!date || !visible) return;
    
    try {
      setLoading(true);
      const response = await aaApi.getImages(date);
      
      if (response.data.success) {
        setImages(response.data.data.images || []);
      } else {
        message.error(response.data.message || 'Failed to get image list');
      }
    } catch (error) {
      console.error('Failed to load AA images:', error);
      message.error('Failed to load image list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [date, visible]);

  // Clean up resources
  useEffect(() => {
    return () => {
      if (stitchedImageUrl) {
        URL.revokeObjectURL(stitchedImageUrl);
      }
    };
  }, [stitchedImageUrl]);

  // Preview image
  const handlePreview = (imagePath: string) => {
    setCurrentImage(imagePath);
    setPreviewVisible(true);
  };

  // Download image
  const handleDownload = (image: AAImage) => {
    const link = document.createElement('a');
    link.href = image.path;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stitch images
  const handleStitchImages = async () => {
    if (images.length === 0) {
      message.warning('No images to stitch');
      return;
    }

    setStitchLoading(true);
    try {
      // Sort by filename to ensure correct stitching order
      const sortedImages = [...images].sort((a, b) => a.filename.localeCompare(b.filename));
      
      // Create image element array
      const imageElements: HTMLImageElement[] = [];
      
      // Load all images
      const loadPromises = sortedImages.map((image) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = document.createElement('img');
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load image: ${image.filename}`));
          img.src = image.path;
        });
      });

      const loadedImages = await Promise.all(loadPromises);
      imageElements.push(...loadedImages);

      if (imageElements.length === 0) {
        message.error('No images loaded successfully');
        return;
      }

      // Calculate stitched canvas dimensions
      const maxWidth = Math.max(...imageElements.map(img => img.naturalWidth));
      const totalHeight = imageElements.reduce((sum, img) => sum + img.naturalHeight, 0);

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        message.error('Cannot create canvas');
        return;
      }

      // Set white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, maxWidth, totalHeight);

      // Draw images one by one
      let currentY = 0;
      for (const img of imageElements) {
        // Center draw
        const x = (maxWidth - img.naturalWidth) / 2;
        ctx.drawImage(img, x, currentY, img.naturalWidth, img.naturalHeight);
        currentY += img.naturalHeight;
      }

      // Convert to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setStitchedImageUrl(url);
          setStitchedImageVisible(true);
          message.success(`Successfully stitched ${imageElements.length} images`);
        } else {
          message.error('Failed to create stitched image');
        }
      }, 'image/png', 0.95);

    } catch (error) {
      console.error('Failed to stitch images:', error);
      message.error('Failed to stitch images, please try again');
    } finally {
      setStitchLoading(false);
    }
  };

  // Download stitched image
  const handleDownloadStitchedImage = () => {
    if (!stitchedImageUrl) return;
    
    const link = document.createElement('a');
    link.href = stitchedImageUrl;
    link.download = `AA_${date}_stitched.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Stitched image download started');
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Modal
        title={
          <Space>
            <FolderOutlined />
            <span>AA Image Viewer - {dayjs(date).format('YYYY-MM-DD')}</span>
            {images.length > 0 && (
              <Text type="secondary">({images.length} images)</Text>
            )}
          </Space>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        bodyStyle={{ height: '75vh', overflow: 'hidden' }}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Action button area */}
          {images.length > 0 && (
            <div style={{ marginBottom: 16, flexShrink: 0 }}>
              <Space>
                <Button
                  type="primary"
                  icon={<AppstoreAddOutlined />}
                  onClick={handleStitchImages}
                  loading={stitchLoading}
                  disabled={images.length === 0}
                >
                  Stitch Images ({images.length})
                </Button>
                {stitchedImageUrl && (
                  <>
                    <Button
                      icon={<PictureOutlined />}
                      onClick={() => setStitchedImageVisible(true)}
                    >
                      View Stitched
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadStitchedImage}
                    >
                      Download Stitched
                    </Button>
                  </>
                )}
              </Space>
            </div>
          )}
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%' 
            }}>
              <Spin size="large" />
            </div>
          ) : images.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No saved images for this date"
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%' 
              }}
            />
          ) : (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <List
                grid={{ 
                  gutter: 16, 
                  xs: 1, 
                  sm: 2, 
                  md: 3, 
                  lg: 4, 
                  xl: 5,
                  xxl: 6 
                }}
                dataSource={images}
                renderItem={(image) => (
                  <List.Item>
                    <Card
                      size="small"
                      cover={
                        <div style={{ 
                          height: 200, 
                          overflow: 'hidden', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: '#f5f5f5'
                        }}>
                          <Image
                            src={image.path}
                            alt={image.filename}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '100%',
                              objectFit: 'contain'
                            }}
                            preview={false}
                            onClick={() => handlePreview(image.path)}
                          />
                        </div>
                      }
                      actions={[
                        <Button
                          key="preview"
                          type="text"
                          icon={<EyeOutlined />}
                          onClick={() => handlePreview(image.path)}
                          title="Preview"
                        />,
                        <Button
                          key="download"
                          type="text"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownload(image)}
                          title="Download"
                        />,
                      ]}
                    >
                      <Card.Meta
                        title={
                          <Text 
                            ellipsis 
                            title={image.filename}
                            style={{ fontSize: '12px' }}
                          >
                            {image.filename}
                          </Text>
                        }
                        description={
                          <div style={{ fontSize: '11px', color: '#999' }}>
                            <div>Size: {formatFileSize(image.size)}</div>
                            <div>Time: {dayjs(image.created).format('HH:mm:ss')}</div>
                          </div>
                        }
                      />
                    </Card>
                  </List.Item>
                )}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Image preview modal */}
      <Image
        style={{ display: 'none' }}
        src={currentImage}
        preview={{
          visible: previewVisible,
          src: currentImage,
          onVisibleChange: (visible) => setPreviewVisible(visible),
        }}
      />

      {/* Stitched image preview modal */}
      <Modal
        title={
          <Space>
            <AppstoreAddOutlined />
            <span>Stitched Image Preview - {dayjs(date).format('YYYY-MM-DD')}</span>
          </Space>
        }
        open={stitchedImageVisible}
        onCancel={() => setStitchedImageVisible(false)}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownloadStitchedImage}>
            Download Stitched
          </Button>
        ]}
        width="80vw"
        style={{ top: 20 }}
        bodyStyle={{ textAlign: 'center', maxHeight: '70vh', overflow: 'auto' }}
      >
        {stitchedImageUrl && (
          <img
            src={stitchedImageUrl}
            alt="Stitched Image"
            style={{
              maxWidth: '100%',
              height: 'auto',
              border: '1px solid #d9d9d9',
              borderRadius: '6px'
            }}
          />
        )}
      </Modal>
    </>
  );
};

export default AAImageViewer;