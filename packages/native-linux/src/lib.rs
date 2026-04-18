#![deny(clippy::all)]

use std::env;
use napi_derive::napi;

#[napi]
pub fn get_display_server_protocol() -> String {
    if env::var("WAYLAND_DISPLAY").is_ok() {
        "wayland".to_string()
    } else if env::var("DISPLAY").is_ok() {
        "x11".to_string()
    } else {
        "unknown".to_string()
    }
}
