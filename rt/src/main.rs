use std::sync::Arc;

use futures::{SinkExt, StreamExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    pretty_env_logger::init();
    log::info!("starting...");

    let rmq_host = std::env::var("RMQ_HOST")?;
    let rmq_user = std::env::var("RMQ_USER")?;
    let rmq_pass = std::env::var("RMQ_PASS")?;
    let rmq_addr = format!("amqp://{rmq_user}:{rmq_pass}@{rmq_host}");

    let server_host = std::env::var("RT_HOST")?;
    let server_port = std::env::var("RT_PORT")?;
    let server_addr = format!("{server_host}:{server_port}");

    let replayers: Arc<Replayers> = Arc::default();
    let cloned_replayers = replayers.clone();

    let replay_handler = tokio::spawn(async move {
        if let Err(err) = handle_replaying(rmq_addr, cloned_replayers).await {
            log::error!("replaying thread error: {err}");
        }
    });

    let server_handler = tokio::spawn(async move {
        if let Err(err) = handle_server(server_addr, replayers).await {
            log::error!("server thread error: {err}");
        }
    });

    tokio::select! {
        _ = replay_handler => {
            log::error!("replay handler died");
            std::process::exit(1);
        },
        _ = server_handler => {
            log::error!("server handler died");
            std::process::exit(1);
        }
    };
}

#[derive(Clone, Debug, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
enum Status {
    PENDING,
    RATED,
    ERROR,
    DELETED,
}

#[derive(Clone, serde::Deserialize, serde::Serialize)]
struct Payload {
    id: i32,
    rating: i32,
    status: Status,
}

#[derive(Default)]
struct Replayer {
    data: Arc<tokio::sync::RwLock<Vec<Payload>>>,
    txs: Arc<tokio::sync::RwLock<Vec<futures::channel::mpsc::UnboundedSender<Payload>>>>,
    // note: can also use tokio's mpsc if add tokio_stream
}

type Replayers = dashmap::DashMap<i32, Arc<Replayer>>;

trait ReplayersExt {
    fn add_replayer(&self, id: i32) -> Arc<Replayer>;
    fn get_replayer(&self, id: i32) -> Arc<Replayer>;
    async fn get_stream(&self, id: i32) -> futures::channel::mpsc::UnboundedReceiver<Payload>;
    async fn add_data(&self, payload: Payload);
}

impl ReplayersExt for Replayers {
    fn add_replayer(&self, id: i32) -> Arc<Replayer> {
        let replayer: Arc<Replayer> = Arc::default();
        self.insert(id, replayer.clone());
        let replayers = self.clone();
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(10)).await;
            replayers.remove(&id);
        });
        return replayer;
    }

    fn get_replayer(&self, id: i32) -> Arc<Replayer> {
        self.get(&id)
            .map(|x| x.clone())
            .unwrap_or(self.add_replayer(id))
    }

    async fn get_stream(&self, id: i32) -> futures::channel::mpsc::UnboundedReceiver<Payload> {
        let replayer = self.get_replayer(id);
        let (mut tx, rx) = futures::channel::mpsc::unbounded::<Payload>();
        replayer.txs.write().await.push(tx.clone());
        for old in replayer.data.read().await.iter() {
            if let Err(err) = tx.send(old.clone()).await {
                log::warn!("failed to send {err}");
            }
        }
        rx
    }

    async fn add_data(&self, payload: Payload) {
        let replayer = self.get_replayer(payload.id);
        replayer.data.write().await.push(payload.clone());
        for mut tx in replayer.txs.read().await.iter() {
            if let Err(err) = tx.send(payload.clone()).await {
                log::warn!("failed to send {err}");
            }
        }
    }
}

async fn handle_replaying(rmq_addr: String, replayers: Arc<Replayers>) -> anyhow::Result<()> {
    let connection =
        lapin::Connection::connect(&rmq_addr, lapin::ConnectionProperties::default()).await?;
    let channel = connection.create_channel().await?;

    channel
        .queue_declare(
            "quote.update",
            lapin::options::QueueDeclareOptions::default(),
            lapin::types::FieldTable::default(),
        )
        .await?;

    let mut consumer = channel
        .basic_consume(
            "quote.update",
            "rt",
            lapin::options::BasicConsumeOptions::default(),
            lapin::types::FieldTable::default(),
        )
        .await?;

    while let Some(Ok(delivery)) = consumer.next().await {
        delivery
            .ack(lapin::options::BasicAckOptions::default())
            .await?;
        let payload: Payload = serde_json::from_slice(&delivery.data)?;
        replayers.add_data(payload).await;
    }

    Ok(())
}

async fn handle_server(server_addr: String, replayers: Arc<Replayers>) -> anyhow::Result<()> {
    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any);
    let router = axum::Router::new()
        .route("/", axum::routing::get(|| async { "OK" })) // health check
        .route("/{id}", axum::routing::get(handle_sse))
        .with_state(replayers)
        .layer(cors);
    let listener = tokio::net::TcpListener::bind(server_addr).await?;

    Ok(axum::serve(listener, router).await?)
}

async fn handle_sse(
    axum::extract::State(replayers): axum::extract::State<Arc<Replayers>>,
    axum::extract::Path(id): axum::extract::Path<i32>,
) -> impl axum::response::IntoResponse {
    let stream = replayers
        .get_stream(id)
        .await
        .map(|payload| axum::response::sse::Event::default().json_data(payload));

    axum::response::Sse::new(stream)
}
