// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Deserialize;

// ── Patient data ──────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct PatientLabel {
    patient_name: Option<String>,
    patient_birth_date: Option<String>,
    patient_gender: Option<String>,
    patient_ak: Option<String>,
}

// ── Windows GDI label printing ────────────────────────────────────────────────
//
// Uses the standard Windows GDI printing API instead of raw PPLA.
// The Argox "PPLA series" driver works like a normal Windows printer:
// it accepts GDI drawing calls and converts them to PPLA internally.
// This is the same approach Argobar Pro uses.

#[cfg(windows)]
mod gdi_print {
    use std::ffi::CString;
    use std::os::windows::ffi::OsStrExt;
    use std::ffi::OsStr;
    use std::ptr;
    use winapi::shared::windef::{RECT, SIZE};
    use winapi::um::wingdi::*;
    use winapi::um::wingdi::GetTextExtentPoint32W;
    use winapi::um::winuser::FillRect;
    use winapi::um::winspool::{
        ClosePrinter, DocumentPropertiesA, OpenPrinterA,
    };

    // Label dimensions in tenths of a millimetre (DEVMODE units)
    // Physical label: 57 mm wide × 27 mm tall
    const LABEL_W_TENTHS: i16 = 570; // 57 mm
    const LABEL_H_TENTHS: i16 = 270; // 27 mm

    /// Convert a &str to a null-terminated UTF-16 Vec for W-suffix WinAPI calls.
    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }

    /// Build a DEVMODEA with paper size set to 57 × 27 mm.
    /// Returns None if the printer cannot be opened or DocumentProperties fails.
    unsafe fn build_devmode(name_c: &CString) -> Option<Vec<u8>> {
        // Open printer handle
        let mut h_printer = ptr::null_mut();
        if OpenPrinterA(name_c.as_ptr() as *mut _, &mut h_printer, ptr::null_mut()) == 0 {
            return None;
        }

        // First call: get required buffer size
        let needed = DocumentPropertiesA(
            ptr::null_mut(), h_printer,
            name_c.as_ptr() as *mut _,
            ptr::null_mut(), ptr::null_mut(), 0,
        );
        if needed <= 0 {
            ClosePrinter(h_printer);
            return None;
        }

        // Allocate buffer, zero-initialised (important — DEVMODE has cbSize field)
        let mut buf = vec![0u8; needed as usize];

        // Second call: fill with current defaults
        let ret = DocumentPropertiesA(
            ptr::null_mut(), h_printer,
            name_c.as_ptr() as *mut _,
            buf.as_mut_ptr() as *mut _,
            ptr::null_mut(),
            2, // DM_OUT_BUFFER
        );
        ClosePrinter(h_printer);

        if ret < 0 { return None; }

        // Patch the DEVMODE fields for custom paper size.
        // DEVMODEA layout (offsets into the struct):
        //   dmFields    : offset 40, DWORD
        //   dmPaperSize : offset 44, WORD  (set to DMPAPER_USER = 256)
        //   dmPaperLength: offset 46, short (tenths of mm, height/feed direction)
        //   dmPaperWidth : offset 48, short (tenths of mm, width)
        //
        // We write directly into the raw buffer because winapi's DEVMODEA
        // binding does not always expose the union fields cleanly.

        // Safety: buf is at least `needed` bytes; offsets verified against
        //         winapi DEVMODEA definition (dmDeviceName=32B, dmSpecVersion=2,
        //         dmDriverVersion=2, dmSize=2, dmDriverExtra=2 = 40B header).
        // DEVMODEA memory layout (all offsets from struct start):
        //   offset  0 : dmDeviceName [32 bytes, CHAR]
        //   offset 32 : dmSpecVersion  WORD
        //   offset 34 : dmDriverVersion WORD
        //   offset 36 : dmSize         WORD
        //   offset 38 : dmDriverExtra  WORD
        //   offset 40 : dmFields       DWORD
        //   offset 44 : dmOrientation  short  ← printer union starts here
        //   offset 46 : dmPaperSize    short
        //   offset 48 : dmPaperLength  short  (feed direction, tenths of mm)
        //   offset 50 : dmPaperWidth   short  (across print head, tenths of mm)
        if buf.len() >= 52 {
            // dmFields |= DM_PAPERSIZE | DM_PAPERLENGTH | DM_PAPERWIDTH
            let fields_ptr = buf.as_mut_ptr().add(40) as *mut u32;
            *fields_ptr |= 0x0002 | 0x0004 | 0x0008; // DM_PAPERSIZE|DM_PAPERLENGTH|DM_PAPERWIDTH

            // dmOrientation = DMORIENT_PORTRAIT (1) — driver handles rotation
            let orient_ptr       = buf.as_mut_ptr().add(44) as *mut i16;
            let paper_size_ptr   = buf.as_mut_ptr().add(46) as *mut i16;
            let paper_length_ptr = buf.as_mut_ptr().add(48) as *mut i16;
            let paper_width_ptr  = buf.as_mut_ptr().add(50) as *mut i16;

            *orient_ptr       = 1i16;           // DMORIENT_PORTRAIT
            *paper_size_ptr   = 256i16;         // DMPAPER_USER — custom size
            *paper_length_ptr = LABEL_H_TENTHS; // 270 = 27 mm (feed direction)
            *paper_width_ptr  = LABEL_W_TENTHS; // 570 = 57 mm (print head width)
        }

        Some(buf)
    }

    pub fn print(
        printer_name: &str,
        patients: &[super::PatientLabel],
        quantity: u32,
    ) -> Result<String, String> {
        unsafe {
            // ── Build DEVMODE with label dimensions ───────────────────────
            let name_c =
                CString::new(printer_name).map_err(|_| "Invalid printer name")?;

            let devmode_buf = build_devmode(&name_c);
            let devmode_ptr = devmode_buf
                .as_ref()
                .map(|b| b.as_ptr() as *const DEVMODEA)
                .unwrap_or(ptr::null());

            // ── Create a printer Device Context ───────────────────────────
            let hdc = CreateDCA(ptr::null(), name_c.as_ptr(), ptr::null(), devmode_ptr);
            if hdc.is_null() {
                return Err(format!(
                    "CreateDC failed for '{}'. Is the driver installed?",
                    printer_name
                ));
            }

            // ── Start document ─────────────────────────────────────────────
            let doc_name_c = CString::new("Clinic Label").unwrap();
            let di = DOCINFOA {
                cbSize: std::mem::size_of::<DOCINFOA>() as i32,
                lpszDocName: doc_name_c.as_ptr(),
                lpszOutput: ptr::null(),
                lpszDatatype: ptr::null(),
                fwType: 0,
            };
            if StartDocA(hdc, &di) <= 0 {
                DeleteDC(hdc);
                return Err("StartDoc failed — printer may be offline.".to_string());
            }

            // ── Page / font metrics ────────────────────────────────────────
            let dpi_y   = GetDeviceCaps(hdc, LOGPIXELSY);
            let page_w  = GetDeviceCaps(hdc, HORZRES);

            // Font sizes in device units (negative = character height in points)
            let sz_hdr  = -(dpi_y * 10 / 72);   // 10 pt  — header
            let sz_body = -(dpi_y *  9 / 72);   // 9 pt  — body fields
            let line_h  =  dpi_y * 11 / 72;     // 11 pt spacing between body lines

            let face = to_wide("Helvetica");

            // ── Print one page per patient × quantity ──────────────────────
            for p in patients {
                let name   = p.patient_name.as_deref().unwrap_or("-");
                let birth  = p.patient_birth_date.as_deref().unwrap_or("-");
                let gender = match p.patient_gender.as_deref().map(|s| s.to_uppercase()).as_deref() {
                    Some("MALE")   | Some("ERKEK") | Some("M") | Some("E") => "Erkek",
                    Some("FEMALE") | Some("KADIN") | Some("F") | Some("K") => "Kadın",
                    _ => "-",
                };
                let ak     = p.patient_ak.as_deref().unwrap_or("-");

                for _ in 0..quantity {
                    if StartPage(hdc) <= 0 {
                        continue;
                    }

                    SetBkMode(hdc, TRANSPARENT as i32);

                    // ── Dark header band ───────────────────────────────────
                    let hdr_h = -(sz_hdr) + 6;           // a bit taller than the font
                    let brush = CreateSolidBrush(RGB(30, 41, 59));
                    let hdr_rect = RECT { left: 0, top: 0, right: page_w, bottom: hdr_h };
                    FillRect(hdc, &hdr_rect, brush);
                    DeleteObject(brush as *mut _);

                    // ── Header text (white, bold) ──────────────────────────
                    let hfont_hdr = CreateFontW(
                        sz_hdr, 0, 0, 0, FW_BOLD as i32,
                        0, 0, 0, DEFAULT_CHARSET as u32,
                        OUT_DEFAULT_PRECIS as u32, CLIP_DEFAULT_PRECIS as u32,
                        DEFAULT_QUALITY as u32, (DEFAULT_PITCH | FF_SWISS) as u32,
                        face.as_ptr(),
                    );
                    SelectObject(hdc, hfont_hdr as *mut _);
                    SetTextColor(hdc, RGB(255, 255, 255));

                    let hdr_text = to_wide("DENTAKAY DENTAL CLINIC");
                    TextOutW(hdc, 4, 3, hdr_text.as_ptr(), (hdr_text.len() - 1) as i32);

                    // ── Body fields (black, normal) ────────────────────────
                    let hfont_body = CreateFontW(
                        sz_body, 0, 0, 0, FW_EXTRABOLD as i32,
                        0, 0, 0, DEFAULT_CHARSET as u32,
                        OUT_DEFAULT_PRECIS as u32, CLIP_DEFAULT_PRECIS as u32,
                        DEFAULT_QUALITY as u32, (DEFAULT_PITCH | FF_SWISS) as u32,
                        face.as_ptr(),
                    );
                    SelectObject(hdc, hfont_body as *mut _);
                    SetTextColor(hdc, RGB(0, 0, 0));

                    let x  = 4i32;
                    let y0 = hdr_h + 4;

                    // ── Patient name — manual word-wrap with TextOutW ─────────
                    // Avoids DrawTextW's extra GDI line-spacing which creates
                    // a phantom blank line after the text.
                    let max_w = page_w - x * 2;
                    let label_prefix = "Ad Soyadi: ";
                    let full_name    = format!("{}{}", label_prefix, name);

                    // Split into words, then greedily pack into lines
                    let words: Vec<&str> = full_name.split_whitespace().collect();
                    let mut lines: Vec<String> = Vec::new();
                    let mut current = String::new();
                    for word in &words {
                        let candidate = if current.is_empty() {
                            word.to_string()
                        } else {
                            format!("{} {}", current, word)
                        };
                        let wcandidate = to_wide(&candidate);
                        let mut sz = SIZE { cx: 0, cy: 0 };
                        GetTextExtentPoint32W(
                            hdc,
                            wcandidate.as_ptr(),
                            (wcandidate.len() - 1) as i32,
                            &mut sz,
                        );
                        if sz.cx > max_w && !current.is_empty() {
                            lines.push(current.clone());
                            current = word.to_string();
                        } else {
                            current = candidate;
                        }
                    }
                    if !current.is_empty() { lines.push(current); }

                    // Draw each wrapped line with the same line_h as other fields
                    let mut cur_y = y0;
                    for line in &lines {
                        let wline = to_wide(line);
                        TextOutW(hdc, x, cur_y, wline.as_ptr(), (wline.len() - 1) as i32);
                        cur_y += line_h;
                    }

                    // Next field starts right after the last name line
                    let after_name = cur_y;
                    let rest = [
                        format!("Doğum Tarihi: {}", birth),
                        format!("Cinsiyet: {}", gender),
                        format!("Ak Kodu: {}", ak),
                    ];
                    for (i, field) in rest.iter().enumerate() {
                        let wfield = to_wide(field);
                        TextOutW(
                            hdc, x, after_name + i as i32 * line_h,
                            wfield.as_ptr(), (wfield.len() - 1) as i32,
                        );
                    }

                    DeleteObject(hfont_hdr  as *mut _);
                    DeleteObject(hfont_body as *mut _);
                    EndPage(hdc);
                }
            }

            EndDoc(hdc);
            DeleteDC(hdc);
        }

        Ok(format!(
            "Sent {} patient(s) × {} label(s) to '{}'.",
            patients.len(),
            quantity,
            printer_name
        ))
    }
}

// ── macOS printer enumeration via lpstat ──────────────────────────────────────

#[cfg(target_os = "macos")]
fn enumerate_printers() -> Vec<String> {
    use std::process::Command;
    match Command::new("lpstat").arg("-p").output() {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            // Lines look like: "printer PrinterName is ..."
            stdout
                .lines()
                .filter_map(|line| {
                    if line.starts_with("printer ") {
                        line.split_whitespace().nth(1).map(|s| s.to_string())
                    } else {
                        None
                    }
                })
                .collect()
        }
        Err(_) => vec![],
    }
}

// ── Windows raw-printer helpers (used only for test_printer / list_printers) ──

#[cfg(windows)]
fn enumerate_printers() -> Vec<String> {
    use std::ffi::CStr;
    use std::ptr;
    use winapi::shared::minwindef::DWORD;
    use winapi::um::winspool::{
        EnumPrintersA, PRINTER_ENUM_CONNECTIONS, PRINTER_ENUM_LOCAL, PRINTER_INFO_2A,
    };
    unsafe {
        let flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS;
        let mut needed: DWORD = 0;
        let mut returned: DWORD = 0;
        EnumPrintersA(flags, ptr::null_mut(), 2, ptr::null_mut(), 0, &mut needed, &mut returned);
        if needed == 0 { return vec![]; }
        let mut buf = vec![0u8; needed as usize];
        if EnumPrintersA(flags, ptr::null_mut(), 2, buf.as_mut_ptr(), needed, &mut needed, &mut returned) == 0 {
            return vec![];
        }
        let printers = std::slice::from_raw_parts(buf.as_ptr() as *const PRINTER_INFO_2A, returned as usize);
        printers.iter().filter_map(|p| {
            if p.pPrinterName.is_null() { return None; }
            CStr::from_ptr(p.pPrinterName).to_str().ok().map(|s| s.to_string())
        }).collect()
    }
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn print_labels(
    printer_name: String,
    patients: Vec<PatientLabel>,
    quantity: u32,
) -> Result<String, String> {
    #[cfg(windows)]
    { gdi_print::print(&printer_name, &patients, quantity) }
    #[cfg(not(windows))]
    { let _ = (printer_name, patients, quantity); Err("Only supported on Windows.".to_string()) }
}

#[tauri::command]
fn test_printer(printer_name: String) -> String {
    #[cfg(windows)]
    {
        use std::ffi::CString;
        use std::ptr;
        use winapi::um::winspool::{ClosePrinter, OpenPrinterA};
        let all = enumerate_printers();
        let found = all.contains(&printer_name);
        if !found {
            return format!(
                "❌ '{}' not found.\nInstalled printers:\n{}",
                printer_name,
                if all.is_empty() { "  (none)".to_string() }
                else { all.iter().map(|p| format!("  • {}", p)).collect::<Vec<_>>().join("\n") }
            );
        }
        let name_c = match CString::new(printer_name.clone()) {
            Ok(c) => c,
            Err(_) => return "❌ Invalid printer name string.".to_string(),
        };
        let mut h = ptr::null_mut();
        let ok = unsafe { OpenPrinterA(name_c.as_ptr() as *mut _, &mut h, ptr::null_mut()) };
        if ok == 0 {
            return format!("❌ Found '{}' but failed to open it. Is it offline?", printer_name);
        }
        unsafe { ClosePrinter(h) };
        format!("✅ '{}' found and opened successfully. Ready to print.", printer_name)
    }
    #[cfg(target_os = "macos")]
    {
        let all = enumerate_printers();
        if all.contains(&printer_name) {
            format!("✅ '{}' found. Ready to print.", printer_name)
        } else {
            format!(
                "❌ '{}' not found.\nInstalled printers:\n{}",
                printer_name,
                if all.is_empty() { "  (none)".to_string() }
                else { all.iter().map(|p| format!("  • {}", p)).collect::<Vec<_>>().join("\n") }
            )
        }
    }
    #[cfg(not(any(windows, target_os = "macos")))]
    { let _ = printer_name; "ℹ️ Printer test not supported on this OS.".to_string() }
}

#[tauri::command]
fn list_printers() -> Vec<String> {
    #[cfg(windows)] { enumerate_printers() }
    #[cfg(target_os = "macos")] { enumerate_printers() }
    #[cfg(not(any(windows, target_os = "macos")))] { vec![] }
}

// ── Entry point ───────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![print_labels, list_printers, test_printer])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
