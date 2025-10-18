// 存储上次检查日期
let lastCheckDate = '';

// 获取今日日期（YYYY-MM-DD格式）
function getTodayDate() {
  console.log('[OA_GET] 获取当前日期');
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  console.log('[OA_GET] 当前日期:', dateStr);
  return dateStr;
}

// 简单的时间检查，不再严格限制每天一次
function shouldCheckTodayNotifications() {
  console.log('[OA_GET] 检查是否需要获取新通知');
  const now = new Date();
  const today = getTodayDate();
  console.log('[OA_GET] 上次检查日期:', lastCheckDate, '当前日期:', today);
  if (lastCheckDate !== today) {
    lastCheckDate = today;
    console.log('[OA_GET] 需要获取新通知');
    return true;
  }
  console.log('[OA_GET] 不需要获取新通知');
  return false;
}

// 计算时间间隔（小时）
function getTimeInterval(timeText) {
  console.log(`[OA_GET] 计算时间间隔: ${timeText}`);
  
  if (!timeText || timeText === '未知') {
    console.log('[OA_GET] 时间为未知，无法计算间隔');
    return Infinity; // 返回极大值表示未知时间
  }
  
  const now = new Date();
  
  // 清理时间文本，移除HTML实体和多余空格
  const cleanTimeText = timeText.replace(/&nbsp;/g, ' ').replace(/[\n\r\t\s]+/g, ' ').trim();
  console.log(`[OA_GET] 清理后时间文本: "${cleanTimeText}"`);
  
  let notificationDate;
  
  // 处理"今天 HH:MM"格式
  if (cleanTimeText.includes('今天')) {
    console.log('[OA_GET] 时间格式：今天');
    const timeMatch = cleanTimeText.match(/今天\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      notificationDate = new Date(now);
      notificationDate.setHours(hours, minutes, 0, 0);
    } else {
      // 如果只有"今天"，认为是当前时间
      notificationDate = new Date(now);
    }
  }
  
  // 处理"昨天 HH:MM"格式
  else if (cleanTimeText.includes('昨天')) {
    console.log('[OA_GET] 时间格式：昨天');
    const timeMatch = cleanTimeText.match(/昨天\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      notificationDate = new Date(now);
      notificationDate.setDate(notificationDate.getDate() - 1);
      notificationDate.setHours(hours, minutes, 0, 0);
    } else {
      // 如果只有"昨天"，认为是昨天中午12点
      notificationDate = new Date(now);
      notificationDate.setDate(notificationDate.getDate() - 1);
      notificationDate.setHours(12, 0, 0, 0);
    }
  }
  
  // 处理"YYYY-MM-DD"格式
  else if (cleanTimeText.match(/(\d{4})-(\d{2})-(\d{2})/)) {
    console.log('[OA_GET] 时间格式：日期');
    const dateMatch = cleanTimeText.match(/(\d{4})-(\d{2})-(\d{2})/);
    notificationDate = new Date(
      parseInt(dateMatch[1]),
      parseInt(dateMatch[2]) - 1,  // 月份从0开始
      parseInt(dateMatch[3])
    );
    
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
  }
  
  // 处理纯时间格式（HH:MM）
  else if (cleanTimeText.match(/^(\d{1,2}):(\d{2})$/)) {
    console.log('[OA_GET] 时间格式：纯时间');
    const timeOnlyMatch = cleanTimeText.match(/^(\d{1,2}):(\d{2})$/);
    const hours = parseInt(timeOnlyMatch[1]);
    const minutes = parseInt(timeOnlyMatch[2]);
    notificationDate = new Date(now);
    notificationDate.setHours(hours, minutes, 0, 0);
    
    // 如果解析出的时间比当前时间晚，说明可能是今天凌晨的时间
    if (notificationDate > now) {
      notificationDate.setDate(notificationDate.getDate() - 1);
    }
  }
  
  else {
    console.log('[OA_GET] 无法识别的时间格式');
    return Infinity;
  }
  
  if (isNaN(notificationDate.getTime())) {
    console.log('[OA_GET] 日期解析失败');
    return Infinity;
  }
  
  const timeDiff = now.getTime() - notificationDate.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60); // 转换为小时
  
  console.log(`[OA_GET] 解析时间：${notificationDate.toLocaleString()}, 间隔：${hoursDiff.toFixed(2)}小时`);
  return hoursDiff;
}

// 判断通知是否是最近24小时内的
function isRecentNotification(timeText) {
  const hoursDiff = getTimeInterval(timeText);
  const isRecent = hoursDiff <= 24;
  console.log(`[OA_GET] 时间间隔：${hoursDiff.toFixed(2)}小时，是否在24小时内：${isRecent}`);
  return isRecent;
}

// 爬取最近24小时通知 - 使用正则表达式解析HTML，避免创建临时标签页
async function fetchTodayNotifications() {
  console.log('[OA_GET] 开始爬取最近24小时通知');
  try {
    // 尝试不同的URL访问方式
    console.log('[OA_GET] 尝试访问通知页面');
    
    // 尝试多个可能的URL
    const urls = [
      'https://oa.jlu.edu.cn/defaultroot/PortalInformation!jldxList.action?channelId=179577',
      
    ];
    
    let response = null;
    let html = '';
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[OA_GET] 尝试URL ${i + 1}: ${url}`);
      
      try {
        response = await fetch(url, {
          method: 'GET',
          credentials: 'include', // 包含cookies以保持会话
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://oa.jlu.edu.cn/'
          }
        });
        
        console.log(`[OA_GET] URL ${i + 1} 响应状态:`, response.status, response.statusText);
        console.log('[OA_GET] 响应头:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          console.log(`[OA_GET] URL ${i + 1} 响应不成功，继续尝试下一个URL`);
          continue;
        }
        
        // 获取页面HTML内容
        html = await response.text();
        console.log(`[OA_GET] URL ${i + 1} 获取内容长度:`, html.length);
        
        // 检查是否获取到了有效内容
        if (!html || html.length < 100) {
          console.log(`[OA_GET] URL ${i + 1} 内容过短，继续尝试下一个URL`);
          continue;
        }
        
        // 检查是否包含登录页面特征
        if (html.includes('登录') || html.includes('login') || html.includes('用户名') || html.includes('密码')) {
          console.log(`[OA_GET] URL ${i + 1} 可能重定向到登录页面，继续尝试下一个URL`);
          continue;
        }
        
        // 如果获取到有效内容，跳出循环
        console.log(`[OA_GET] URL ${i + 1} 获取到有效内容，停止尝试其他URL`);
        break;
        
      } catch (error) {
        console.log(`[OA_GET] URL ${i + 1} 访问失败:`, error.message);
      }
    }
    
    if (!html) {
      throw new Error('所有URL尝试失败，无法获取有效内容');
    }
    
    console.log('[OA_GET] 成功获取页面内容，长度:', html.length);
    
    // 使用正则表达式解析HTML，避免使用DOMParser
    console.log('[OA_GET] 开始使用正则表达式解析页面内容');
    
    // 调试：输出部分HTML内容查看结构
    console.log('[OA_GET] HTML内容字符:', html);
    
    // 使用新的匹配模式（基于你提供的HTML结构）
    const notificationRegex = /<DIV class="li rel">([\s\S]*?)<\/DIV>/gi;
    
    const allNotifications = [];
    let match;
    let notificationCount = 0;
    
    // 使用新的匹配模式
    while ((match = notificationRegex.exec(html)) !== null) {
      notificationCount++;
      console.log(`[OA_GET] 找到通知项 #${notificationCount}`);
      processNotificationItem(match[1], allNotifications, notificationCount);
    }
    
    // 处理通知项的函数
    function processNotificationItem(notificationHtml, allNotifications, count) {
      console.log(`[OA_GET] 处理通知项 #${count}，HTML内容:`, notificationHtml.substring(0, 200));
      
      // 提取标题和链接 - 专门匹配 class="font14" 的A标签
      const titleMatch = notificationHtml.match(/<A[^>]*class="[^"]*font14[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/A>/i);
      
      // 提取时间 - 匹配SPAN标签
      const timeMatch = notificationHtml.match(/<SPAN[^>]*class="[^"]*time[^"]*"[^>]*>([\s\S]*?)<\/SPAN>/i) || 
                       notificationHtml.match(/昨天|今天|\d{4}-\d{2}-\d{2}/i);
      
      // 提取部门 - 匹配 class="column" 的A标签
      const departmentMatch = notificationHtml.match(/<A[^>]*class="[^"]*column[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/A>/i);
      
      if (!titleMatch) {
        console.log(`[OA_GET] 通知项 #${count} 未找到标题，跳过`);
        return;
      }
      
      const title = titleMatch[2].trim();
      if (title.includes('标题') || title.trim() === '') {
        console.log(`[OA_GET] 通知项 #${count} 是标题行或空行，跳过`);
        return;
      }
      
      // 提取链接并确保包含/defaultroot路径
      let url = 'https://oa.jlu.edu.cn';
      const href = titleMatch[1];
      if (href && !href.startsWith('http')) {
        if (href.startsWith('/')) {
          // 检查是否已经包含/defaultroot路径
          if (!href.includes('/defaultroot/')) {
            // 如果没有，添加/defaultroot路径
            url += '/defaultroot' + href;
          } else {
            url += href;
          }
        } else {
          url += '/defaultroot/' + href;
        }
      } else if (href) {
        url = href;
      }
      
      // 提取时间
      let time = '未知';
      if (timeMatch && timeMatch[1]) {
        time = timeMatch[1].trim();
      } else if (typeof timeMatch === 'string') {
        time = timeMatch;
      }
      
      console.log(`[OA_GET] 通知项 #${count} 时间: ${time}`);
      
      // 提取发布单位
      let department = '未知';
      if (departmentMatch && departmentMatch[2]) {
        department = departmentMatch[2].trim();
      }
      
      // 计算时间间隔
      const hoursDiff = getTimeInterval(time);
      
      console.log(`[OA_GET] 通知项 #${count} 信息: 标题=${title}, 单位=${department}, 时间=${time}, 间隔=${hoursDiff.toFixed(2)}小时`);
      
      allNotifications.push({
        title: title,
        url: url,
        department: department,
        time: time,
        hoursDiff: hoursDiff
      });
    }
    
    console.log(`[OA_GET] 正则解析完成，找到通知项数量: ${allNotifications.length}`);
    
    // 使用isRecentNotification函数筛选最近24小时的通知
    const recentNotifications = allNotifications.filter(notification => {
      return isRecentNotification(notification.time);
    });
    
    console.log('[OA_GET] 筛选出最近24小时的通知数量:', recentNotifications.length);
    console.log('[OA_GET] 爬取完成，符合条件的通知数量:', recentNotifications.length);
    return recentNotifications;
  } catch (error) {
    console.error('[OA_GET] 爬取通知失败:', error);
    return [];
  }
}


// 显示通知窗口
function showNotificationsWindow(notifications) {
  console.log('[OA_GET] 准备显示通知窗口，通知数量:', notifications.length);
  
  // 创建新标签页显示通知
  chrome.tabs.create({
    url: 'popup.html',
    active: true
  }, (tab) => {
    console.log('[OA_GET] 创建标签页成功，标签页ID:', tab.id);
    
    // 等待标签页加载完成后发送通知数据
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      console.log('[OA_GET] 标签页状态更新 - 标签页ID:', tabId, '状态:', changeInfo.status);
      if (tabId === tab.id && changeInfo.status === 'complete') {
        console.log('[OA_GET] 标签页加载完成，开始发送通知数据');
        chrome.tabs.sendMessage(tabId, { notifications });
        console.log('[OA_GET] 通知数据发送完成，移除监听器');
        chrome.tabs.onUpdated.removeListener(listener);
      }
    });
  });
}

// 浏览器启动时执行
chrome.runtime.onStartup.addListener(async () => {
  console.log('[OA_GET] 浏览器启动，开始初始化插件');
  
  if (shouldCheckTodayNotifications()) {
    console.log('[OA_GET] 需要获取新通知');
    const notifications = await fetchTodayNotifications();
    console.log('[OA_GET] 获取到通知数量:', notifications.length);
    
    if (notifications.length > 0) {
      console.log('[OA_GET] 有新通知，准备显示通知窗口');
      showNotificationsWindow(notifications);
    } else {
      console.log('[OA_GET] 暂无新通知');
    }
    
    // 存储通知到本地存储，供popup.html使用
    console.log('[OA_GET] 存储通知到本地存储');
    chrome.storage.local.set({ todayNotifications: notifications }, () => {
      if (chrome.runtime.lastError) {
        console.error('[OA_GET] 存储通知失败:', chrome.runtime.lastError);
      } else {
        console.log('[OA_GET] 存储通知成功');
      }
    });
  }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[OA_GET] 收到来自popup的消息:', message, '发送者:', sender.tab ? `标签页 ${sender.tab.id}` : '未知');
  
  if (message.action === 'getTodayNotifications') {
    console.log('[OA_GET] 处理getTodayNotifications请求');
    
    // 先从存储中获取
    console.log('[OA_GET] 从本地存储获取通知');
    chrome.storage.local.get(['todayNotifications'], async (result) => {
      if (chrome.runtime.lastError) {
        console.error('[OA_GET] 从本地存储获取通知失败:', chrome.runtime.lastError);
      } else {
        console.log('[OA_GET] 本地存储中的通知数量:', result.todayNotifications ? result.todayNotifications.length : 0);
      }
      
      // 每次都重新爬取最新通知，确保数据及时更新
      console.log('[OA_GET] 开始重新爬取最新通知');
      const notifications = await fetchTodayNotifications();
      
      // 更新本地存储
      console.log('[OA_GET] 更新本地存储中的通知');
      chrome.storage.local.set({ todayNotifications: notifications }, () => {
        if (chrome.runtime.lastError) {
          console.error('[OA_GET] 更新本地存储失败:', chrome.runtime.lastError);
        } else {
          console.log('[OA_GET] 更新本地存储成功');
        }
      });
      
      // 发送响应
      console.log('[OA_GET] 发送通知响应，通知数量:', notifications.length);
      sendResponse({ notifications });
    });
    
    return true; // 异步响应
  }
  
  console.log('[OA_GET] 未处理的消息类型');
});