use clap::Parser;

#[derive(Parser, Debug)]
pub(crate) struct AppConfig {
    #[arg(long,default_value = "0.0.0.0",env="APP_SERVE_IPV4")]
    pub(crate) ipv4:String,
    #[arg(long,default_value = "1000",env="APP_SERVE_PORT")]
    pub(crate) port:u16,
}

impl Default for AppConfig{
    fn default() -> Self {
        Self::parse()
    }
}