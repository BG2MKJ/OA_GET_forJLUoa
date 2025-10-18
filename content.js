// 判断通知是否是最近24小时内的
function isRecentNotification(timeText) {
  console.log(`[OA_GET] [Content] 检查通知时间是否在24小时内: ${timeText}`);
  
  if (!timeText || timeText === '未知') {
    console.log('[OA_GET] [Content] 时间为未知，跳过');
    return false;
  }
  
  const now = new Date();
  const time24HoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // 清理时间文本，移除多余空格和特殊字符
  const cleanTimeText = timeText.replace(/[\n\r\t\s]+/g, ' ').trim();
  
  // 处理"今天 HH:MM"格式
  if (cleanTimeText.includes('今天')) {
    console.log('[OA_GET] [Content] 时间格式：今天');
    const timeMatch = cleanTimeText.match(/今天\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const notificationDate = new Date(now);
      notificationDate.setHours(hours, minutes, 0, 0);
      
      console.log(`[OA_GET] [Content] 解析时间：${notificationDate.toLocaleString()}`);
      return notificationDate >= time24HoursAgo;
    }
    // 只要包含"今天"就认为是符合条件
    console.log('[OA_GET] [Content] 包含"今天"，符合条件');
    return true;
  }
  
  // 处理"昨天 HH:MM"格式
  if (cleanTimeText.includes('昨天')) {
    console.log('[OA_GET] [Content] 时间格式：昨天');
    const timeMatch = cleanTimeText.match(/昨天\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const notificationDate = new Date(now);
      notificationDate.setDate(notificationDate.getDate() - 1);
      notificationDate.setHours(hours, minutes, 0, 0);
      
      console.log(`[OA_GET] [Content] 解析时间：${notificationDate.toLocaleString()}`);
      return notificationDate >= time24HoursAgo;
    }
    
    // 如果只有"昨天"，计算是否在24小时内
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    console.log(`[OA_GET] [Content] 昨天日期：${yesterday.toLocaleDateString()}`);
    
    // 如果当前时间在上午，昨天的通知可能都在24小时内；如果在下午，只有昨天下午和晚上的通知在24小时内
    const currentHour = now.getHours();
    if (currentHour < 12) {
      console.log('[OA_GET] [Content] 当前时间在上午，昨天的通知符合条件');
      return true;
    } else {
      console.log('[OA_GET] [Content] 当前时间在下午，检查昨天的通知是否在24小时内');
      const yesterdayAfternoon = new Date(yesterday);
      yesterdayAfternoon.setHours(12, 0, 0, 0);
      return yesterdayAfternoon >= time24HoursAgo;
    }
  }
  
  // 处理"YYYY-MM-DD"格式
  const dateMatch = cleanTimeText.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    console.log('[OA_GET] [Content] 时间格式：日期');
    const notificationDate = new Date(
      parseInt(dateMatch[1]),
      parseInt(dateMatch[2]) - 1,  // 月份从0开始
      parseInt(dateMatch[3])
    );
    
    if (isNaN(notificationDate.getTime())) {
      console.log('[OA_GET] [Content] 日期解析失败');
      return false;
    }
    
    // 尝试提取时间部分（如果有）
    const timePartMatch = cleanTimeText.match(/(\d{1,2}):(\d{2})/);
    if (timePartMatch) {
      notificationDate.setHours(
        parseInt(timePartMatch[1]),
        parseInt(timePartMatch[2]),
        0,
        0
      );
    }
    
    console.log(`[OA_GET] [Content] 解析时间：${notificationDate.toLocaleString()}`);
    return notificationDate >= time24HoursAgo;
  }
  
  // 处理纯时间格式（HH:MM）
  const timeOnlyMatch = cleanTimeText.match(/^(\d{1,2}):(\d{2})$/);
  if (timeOnlyMatch) {
    console.log('[OA_GET] [Content] 时间格式：纯时间');
    const hours = parseInt(timeOnlyMatch[1]);
    const minutes = parseInt(timeOnlyMatch[2]);
    const notificationDate = new Date(now);
    notificationDate.setHours(hours, minutes, 0, 0);
    
    // 如果解析出的时间比当前时间晚，说明可能是今天凌晨的时间
    if (notificationDate > now) {
      notificationDate.setDate(notificationDate.getDate() - 1);
    }
    
    console.log(`[OA_GET] [Content] 解析时间：${notificationDate.toLocaleString()}`);
    return notificationDate >= time24HoursAgo;
  }
  
  console.log('[OA_GET] [Content] 无法识别的时间格式，不符合条件');
  return false;
}

// 从页面中提取通知的函数 - 不进行时间筛选，返回所有通知供background筛选
function extractTodayNotifications() {
  console.log('[OA_GET] [Content] 开始从页面提取通知');
  
  // 使用DOMParser解析页面内容
  const parser = new DOMParser();
  const doc = parser.parseFromString(document.documentElement.outerHTML, 'text/html');
  
  // 获取所有通知项（匹配div.li.rel结构）
  const notificationItems = doc.querySelectorAll('.li.rel');
  console.log(`[OA_GET] [Content] 找到通知项数量: ${notificationItems.length}`);
  
  const allNotifications = [];
  
  notificationItems.forEach((item, index) => {
    console.log(`[OA_GET] [Content] 处理通知项 #${index + 1}`);
    
    // 尝试提取标题和链接
    const titleElement = item.querySelector('a.font14');
    if (!titleElement) {
      console.log(`[OA_GET] [Content] 通知项 #${index + 1} 未找到标题元素，跳过`);
      return;
    }
    
    // 清理标题中的多余空格
    const title = titleElement.textContent.trim();
    
    // 跳过标题行或非通知项
    if (title.includes('标题') || title.trim() === '') {
      console.log(`[OA_GET] [Content] 通知项 #${index + 1} 是标题行或空行，跳过`);
      return;
    }
    
    // 提取链接并构建完整URL
    const href = titleElement.getAttribute('href');
    let url = 'https://oa.jlu.edu.cn';
    if (href && !href.startsWith('http')) {
      if (href.startsWith('/')) {
        url += href;
      } else {
        url += '/' + href;
      }
    } else if (href) {
      url = href;
    }
    
    // 提取时间（从span.time元素中获取）
    let time = '未知';
    const timeElement = item.querySelector('span.time');
    if (timeElement) {
      time = timeElement.textContent.trim();
    }
    
    console.log(`[OA_GET] [Content] 通知项 #${index + 1} 时间: ${time}`);
    
    // 提取发布单位（从a.column元素中获取）
    let department = '未知';
    const deptElement = item.querySelector('a.column');
    if (deptElement) {
      department = deptElement.textContent.trim();
    } else {
      console.log(`[OA_GET] [Content] 通知项 #${index + 1} 未找到部门信息`);
    }
    
    // 构建通知对象
    const notification = {
      title: title,
      url: url,
      department: department,
      time: time
    };
    
    console.log(`[OA_GET] [Content] 通知项 #${index + 1} 信息: 标题=${title}, 单位=${department}, 时间=${time}`);
    allNotifications.push(notification);
  });
  
  console.log('[OA_GET] [Content] 提取完成，总通知数量:', allNotifications.length);
  
  // 返回所有通知，由background进行时间筛选
  return allNotifications;
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[OA_GET] [Content] 收到来自background的消息:', message);
  
  if (message.action === 'extractNotifications') {
    console.log('[OA_GET] [Content] 处理extractNotifications请求');
    const notifications = extractTodayNotifications();
    console.log('[OA_GET] [Content] 提取到通知数量:', notifications.length, '准备发送响应');
    sendResponse({ notifications });
    console.log('[OA_GET] [Content] 响应发送完成');
  } else {
    console.log('[OA_GET] [Content] 未处理的消息类型');
  }
});

// 如果页面加载完成，自动提取并存储今日通知
window.addEventListener('load', () => {
  console.log('[OA_GET] [Content] 页面加载完成，开始提取通知');
  const notifications = extractTodayNotifications();
  
  if (notifications.length > 0) {
    console.log('[OA_GET] [Content] 找到新通知，准备存储到本地存储');
    chrome.storage.local.set({ todayNotifications: notifications }, () => {
      if (chrome.runtime.lastError) {
        console.error('[OA_GET] [Content] 存储通知失败:', chrome.runtime.lastError);
      } else {
        console.log('[OA_GET] [Content] 存储通知成功，数量:', notifications.length);
      }
    });
  } else {
    console.log('[OA_GET] [Content] 未找到符合条件的新通知');
  }
});