#[tauri::command]
fn window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_maximize(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn window_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_set_always_on_top(window: tauri::Window, flag: bool) -> Result<(), String> {
    window.set_always_on_top(flag).map_err(|e| e.to_string())
}

#[tauri::command]
fn window_set_size(window: tauri::Window, width: f64, height: f64) -> Result<(), String> {
    window.set_size(tauri::LogicalSize::new(width, height)).map_err(|e| e.to_string())
}

#[tauri::command]
fn window_get_size(window: tauri::Window) -> Result<(f64, f64), String> {
    let size = window.inner_size().map_err(|e| e.to_string())?;
    let scale_factor = window.scale_factor().map_err(|e| e.to_string())?;
    let logical_size = size.to_logical::<f64>(scale_factor);
    Ok((logical_size.width, logical_size.height))
}

#[tauri::command]
fn window_start_dragging(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_is_maximized(window: tauri::Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

// Windows: 窗口配置 shadow=true 会让 tao 添加 WS_THICKFRAME，
// 这是无边框窗口原生边缘缩放（鼠标拖窗口边缘改大小）能力的来源。
// 但 DWM 会沿窗口矩形绘制系统方形阴影/边框，在圆角内容外的透明区露出直角，
// 这里通过禁用 DWM 非客户区渲染一次性关闭系统阴影，视觉阴影由前端 CSS box-shadow 实现
// （跟随圆角），既保留原生缩放能力又消除直角，且无窗口样式切换带来的卡顿。
#[cfg(windows)]
#[link(name = "dwmapi")]
extern "system" {
    fn DwmSetWindowAttribute(
        hwnd: *mut core::ffi::c_void,
        dwattribute: u32,
        pvattribute: *const core::ffi::c_void,
        cbattribute: u32,
    ) -> i32;
}

#[cfg(windows)]
fn disable_dwm_frame_rendering(window: &tauri::WebviewWindow) {
    const DWMWA_NCRENDERING_POLICY: u32 = 2;
    const DWMNCRP_DISABLED: u32 = 1;
    if let Ok(hwnd) = window.hwnd() {
        let policy: u32 = DWMNCRP_DISABLED;
        let hr = unsafe {
            DwmSetWindowAttribute(
                hwnd.0,
                DWMWA_NCRENDERING_POLICY,
                &policy as *const u32 as *const core::ffi::c_void,
                4,
            )
        };
        if hr != 0 {
            eprintln!("DwmSetWindowAttribute(NCRENDERING_POLICY) failed: 0x{:08X}", hr);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(windows)]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    disable_dwm_frame_rendering(&window);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            window_minimize,
            window_maximize,
            window_close,
            window_set_always_on_top,
            window_set_size,
            window_get_size,
            window_start_dragging,
            window_is_maximized
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
