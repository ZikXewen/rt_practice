use futures::{StreamExt, TryStreamExt};
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    pretty_env_logger::init();
    log::info!("starting...");

    let db_host = std::env::var("DB_HOST")?;
    let db_user = std::env::var("DB_USER")?;
    let db_pass = std::env::var("DB_PASS")?;
    let db_name = std::env::var("DB_NAME")?;
    let db_addr = format!("postgres://{db_user}:{db_pass}@{db_host}/{db_name}");

    let rmq_host = std::env::var("RMQ_HOST")?;
    let rmq_user = std::env::var("RMQ_USER")?;
    let rmq_pass = std::env::var("RMQ_PASS")?;
    let rmq_addr = format!("amqp://{rmq_user}:{rmq_pass}@{rmq_host}");

    let (tx, rx) = futures::channel::mpsc::unbounded::<String>();

    let db_addr_clone = db_addr.clone();
    let listening_handler = tokio::spawn(async move {
        if let Err(err) = handle_listening(&db_addr_clone, tx).await {
            log::error!("listening thread error: {err}");
        }
    });

    let rating_handler = tokio::spawn(async move {
        if let Err(err) = handle_rating(&db_addr, &rmq_addr, rx).await {
            log::error!("rating thread error: {err}");
        }
    });

    tokio::select! {
        _ = listening_handler => {
            log::error!("listening handler died");
            std::process::exit(1);
        },
        _ = rating_handler => {
            log::error!("rating handler died");
            std::process::exit(1);
        },
    };
}

async fn handle_listening(
    addr: &str,
    tx: futures::channel::mpsc::UnboundedSender<String>,
) -> anyhow::Result<()> {
    let (client, mut connection) = tokio_postgres::connect(addr, tokio_postgres::NoTls).await?;
    log::info!("db listening connection established");

    let connection = futures::stream::poll_fn(move |cx| connection.poll_message(cx))
        .map_err(|e| panic!("{}", e))
        .and_then(|msg| async {
            if let tokio_postgres::AsyncMessage::Notification(msg) = msg {
                Ok(msg.payload().to_string())
            } else {
                panic!()
            }
        })
        .forward(tx);
    let handle = tokio::spawn(connection);

    client.batch_execute("LISTEN submit_quote;").await?;
    log::info!("listening to notification...");

    Ok(handle.await??)
}

async fn handle_rating(
    db_addr: &str,
    rmq_addr: &str,
    mut rx: futures::channel::mpsc::UnboundedReceiver<String>,
) -> anyhow::Result<()> {
    let (client, _connection) = tokio_postgres::connect(&db_addr, tokio_postgres::NoTls).await?;
    let client = Arc::new(client);
    log::info!("db rating connection established");
    let rmq_connection =
        lapin::Connection::connect(&rmq_addr, lapin::ConnectionProperties::default()).await?;
    let channel = rmq_connection.create_channel().await?;
    let channel = Arc::new(channel);
    log::info!("rmq connection established");

    while let Some(id) = rx.next().await {
        let client = client.clone();
        let channel = channel.clone();
        tokio::spawn(rate(client, channel, id));
    }

    Ok(())
}

async fn rate(
    client: Arc<tokio_postgres::Client>,
    channel: Arc<lapin::Channel>,
    id: String,
) -> anyhow::Result<()> {
    let id = id.parse::<u32>()?;
    let row = client
        .query_one("SELECT text, status FROM Quote WHERE id=$1", &[&id])
        .await?;

    let _text: String = row.get(0);
    let status: String = row.get(1);

    log::info!("status: {status}");

    // simulate rating procedure
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    client
        .execute(
            "UPDATE Quote SET status=$1, rating=$2 WHERE id=$3",
            &[&status, &0, &id],
        )
        .await?;
    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
    let rating: u32 = rand::random_range(0..=5);
    let row = client
        .query_one(
            "UPDATE Quote SET status=$1, rating=$2 WHERE id=$3 RETURNING id, status, rating",
            &[&status, &rating, &id],
        )
        .await?;

    let id: u32 = row.get(0);
    let status: String = row.get(1);
    let rating: String = row.get(2);

    // let payload = serde_json::json!({"id": id, "status": status, "rating": rating}).to_string();
    // channel
    //     .basic_publish(
    //         "",
    //         "quote.update",
    //         lapin::options::BasicPublishOptions::default(),
    //         payload.as_bytes(),
    //         lapin::BasicProperties::default(),
    //     )
    //     .await?;

    Ok(())
}
