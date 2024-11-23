let cropper = null;
let currentMaterialIndex = 0;
let materialsData = [];

document.getElementById('modelInput').addEventListener('change', handleModelUpload);
// document.getElementById('textureInput').addEventListener('change', handleTextureUpload);

// 处理编辑器按钮事件
document.getElementById('rotateLeft').addEventListener('click', () => cropper.rotate(-90));
document.getElementById('rotateRight').addEventListener('click', () => cropper.rotate(90));
document.getElementById('zoomIn').addEventListener('click', () => cropper.zoom(0.1));
document.getElementById('zoomOut').addEventListener('click', () => cropper.zoom(-0.1));
document.getElementById('resetCrop').addEventListener('click', () => cropper.reset());

// 应用裁剪
document.getElementById('applyCrop').addEventListener('click', async () => {
  if (!cropper) return;

  try {
    // 获取裁剪后的图片数据
    const canvas = cropper.getCroppedCanvas({
      maxWidth: 2048,
      maxHeight: 2048,
      fillColor: 'transparent',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    // 转换为 Blob，使用 PNG 格式以保持透明度
    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/png', 1.0)
    );
    const imageUrl = URL.createObjectURL(blob);

    // 应用到模型
    const modelViewer = document.getElementById('modelViewer');
    const material = modelViewer.model.materials[currentMaterialIndex];

    if (!material) {
      throw new Error('未找到选中的材质');
    }

    const texture = await modelViewer.createTexture(imageUrl);
    material.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
    modelViewer.needsRender = true;

    // 关闭编辑器
    document.getElementById('imageEditorContainer').style.display = 'none';
    cropper.destroy();
    cropper = null;

    // 在应用纹理后保存纹理URL
    materialsData[currentMaterialIndex].textureUrl = imageUrl;

  } catch (error) {
    console.error('应用贴图时出错:', error);
    alert('应用贴图时出错，请重试');
  }
});

// 取消裁剪
document.getElementById('cancelCrop').addEventListener('click', () => {
  document.getElementById('imageEditorContainer').style.display = 'none';
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
});

// 处理贴图上传
async function handleTextureUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const modelViewer = document.getElementById('modelViewer');
  if (!modelViewer.src) {
    alert('请先上传3D模型！');
    return;
  }

  // 显示图片编辑器
  const imageEditor = document.getElementById('imageEditor');
  const reader = new FileReader();

  reader.onload = function (e) {
    imageEditor.src = e.target.result;
    document.getElementById('imageEditorContainer').style.display = 'block';

    // 初始化 Cropper
    if (cropper) {
      cropper.destroy();
    }

    cropper = new Cropper(imageEditor, {
      viewMode: 0,
      dragMode: 'move',
      aspectRatio: NaN,
      autoCropArea: 1,
      restore: false,
      modal: true,
      guides: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      background: false,
      movable: true,
      scalable: true,
      zoomable: true,
      cropBoxResizable: true,
      minCropBoxWidth: 10,
      minCropBoxHeight: 10,
      minCanvasWidth: 0,
      minCanvasHeight: 0,
    });
  };

  reader.readAsDataURL(file);

  // 在应用纹理成功后，更新对应材质卡片的预览
  const materialCards = document.querySelectorAll('.material-card');
  if (materialCards[currentMaterialIndex]) {
    const previewImage = materialCards[currentMaterialIndex].querySelector('img');
    if (previewImage) {
      previewImage.src = materialsData[currentMaterialIndex].texturePreview;
      previewImage.style.display = 'block';
    }
  }
}

// 处理模型上传
async function handleModelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const modelUrl = URL.createObjectURL(file);
  const modelViewer = document.getElementById('modelViewer');
  modelViewer.src = modelUrl;

  modelViewer.addEventListener('load', async () => {
    await modelViewer.updateComplete;
    // 初始化材质数据
    materialsData = modelViewer.model.materials.map((_, index) => ({
      materialIndex: index,
      textureUrl: null,
      properties: {
        metallic: 0,
        roughness: 1,
        scale: 1,
        rotation: 0
      }
    }));
    createMaterialSelector(modelViewer);
  });
}

// 创建材质选择器
function createMaterialSelector(modelViewer) {
  const materials = modelViewer.model.materials;
  if (!materials || materials.length === 0) {
    console.warn('模型没有可用的材质');
    return;
  }

  const controlsContainer = document.querySelector('.controls');

  // 清除现有的材质选择器
  const existingSelector = document.getElementById('materialControlsContainer');
  if (existingSelector) {
    existingSelector.remove();
  }

  const container = document.createElement('div');
  container.id = 'materialControlsContainer';
  container.style.marginTop = '20px';

  // 创建材质卡片容器
  const materialCardsContainer = document.createElement('div');
  materialCardsContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
    margin-top: 20px;
  `;

  // 为每个材质创建卡片
  materials.forEach((material, index) => {
    const card = createMaterialCard(index);
    materialCardsContainer.appendChild(card);
  });

  // 属性调整控件
  const propertiesContainer = document.createElement('div');
  propertiesContainer.innerHTML = `
    <div class="property-control">
      <label>金属度：<input type="range" id="metallic" min="0" max="1" step="0.1" value="0"></label>
      <span id="metallicValue">0</span>
    </div>
    <div class="property-control">
      <label>粗糙度：<input type="range" id="roughness" min="0" max="1" step="0.1" value="1"></label>
      <span id="roughnessValue">1</span>
    </div>
    <div class="property-control">
      <label>缩放：<input type="range" id="scale" min="0.1" max="5" step="0.1" value="1"></label>
      <span id="scaleValue">1</span>
    </div>
    <div class="property-control">
      <label>旋转：<input type="range" id="rotation" min="0" max="360" step="1" value="0"></label>
      <span id="rotationValue">0</span>
    </div>
  `;

  // 提交按钮
  const submitButton = document.createElement('button');
  submitButton.textContent = '导出材质设置';
  submitButton.onclick = exportMaterialSettings;

  // 组装界面
  container.appendChild(materialCardsContainer);
  container.appendChild(propertiesContainer);
  container.appendChild(submitButton);
  controlsContainer.appendChild(container);

  // 设置事件监听
  setupPropertyListeners();
}

// 添加新函数：设置属性监听器
function setupPropertyListeners() {
  ['metallic', 'roughness', 'scale', 'rotation'].forEach(prop => {
    const input = document.getElementById(prop);
    const valueSpan = document.getElementById(`${prop}Value`);

    input.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      valueSpan.textContent = value;

      // 更新材质数据
      materialsData[currentMaterialIndex].properties[prop] = value;

      // 实时更新模型材质
      updateMaterialProperty(prop, value);
    });
  });
}

// 添加新函数：更新材质属性显示
function updatePropertyControls(materialIndex) {
  const data = materialsData[materialIndex];
  if (!data) return;

  Object.entries(data.properties).forEach(([prop, value]) => {
    const input = document.getElementById(prop);
    const valueSpan = document.getElementById(`${prop}Value`);
    if (input && valueSpan) {
      input.value = value;
      valueSpan.textContent = value;
    }
  });
}

// 添加新函数：更新模型材质属性
function updateMaterialProperty(property, value) {
  const modelViewer = document.getElementById('modelViewer');
  const material = modelViewer.model.materials[currentMaterialIndex];

  if (!material) return;

  switch (property) {
    case 'metallic':
      material.pbrMetallicRoughness.setMetallicFactor(value);
      break;
    case 'roughness':
      material.pbrMetallicRoughness.setRoughnessFactor(value);
      break;
    case 'scale':
      // 这里需要更新纹理的变换矩阵
      // 具体实现取决于您的模型查看器API
      break;
    case 'rotation':
      // 这里需要更新纹理的变换矩阵
      // 具体实现取决于您的模型查看器API
      break;
  }

  modelViewer.needsRender = true;
}

// 添加新函数：导出材质设置
function exportMaterialSettings() {
  const settings = materialsData.map(data => ({
    materialIndex: data.materialIndex,
    textureUrl: data.textureUrl,
    properties: { ...data.properties }
  }));

  console.log('材质设置：', settings);
  // 这里可以添加将设置保存到文件或发送到服务器的逻辑
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'material-settings.json';
  a.click();

  URL.revokeObjectURL(url);
}

// 清理资源
window.addEventListener('beforeunload', () => {
  if (cropper) {
    cropper.destroy();
  }
  const modelViewer = document.getElementById('modelViewer');
  if (modelViewer.src) {
    URL.revokeObjectURL(modelViewer.src);
  }
});

// 添加新函数：创建材质卡片
function createMaterialCard(materialIndex) {
  const card = document.createElement('div');
  card.className = 'material-card';
  card.style.cssText = `
    border: 1px solid #ccc;
    padding: 15px;
    border-radius: 8px;
    background: #f9f9f9;
  `;

  // 卡片标题
  const title = document.createElement('h3');
  title.textContent = `材质 ${materialIndex + 1}`;
  title.style.marginTop = '0';

  // 预览图区域
  const previewContainer = document.createElement('div');
  previewContainer.style.cssText = `
    width: 100%;
    height: 100px;
    border: 2px dashed #ccc;
    margin: 10px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
  `;

  const previewImage = document.createElement('img');
  previewImage.style.cssText = `
    max-width: 100%;
    max-height: 100%;
    display: none;
  `;
  previewContainer.appendChild(previewImage);

  // 上传按钮
  const uploadButton = document.createElement('button');
  uploadButton.textContent = '上传纹理';
  uploadButton.style.width = '100%';

  // 文件输入
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  // 处理文件上传
  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      // 显示预览
      previewImage.src = e.target.result;
      previewImage.style.display = 'block';

      // 存储到材质数据
      materialsData[materialIndex].texturePreview = e.target.result;
    };
    reader.readAsDataURL(file);

    // 处理纹理上传
    currentMaterialIndex = materialIndex; // 设置当前材质索引
    handleTextureUpload(event);
  });

  uploadButton.addEventListener('click', () => {
    fileInput.click();
  });

  // 组装卡片
  card.appendChild(title);
  card.appendChild(previewContainer);
  card.appendChild(uploadButton);
  card.appendChild(fileInput);

  return card;
} 