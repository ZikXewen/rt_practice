# https://dev.to/rogertorres/first-steps-with-docker-rust-30oi
FROM rust:1.88-slim AS build

RUN USER=root cargo new --bin rt
WORKDIR /rt

COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml
RUN cargo build --release
RUN rm src/*.rs

COPY ./src ./src
RUN rm ./target/release/deps/rt*
RUN cargo build --release

FROM debian:bookworm-slim

COPY --from=build /rt/target/release/rt /usr/src/rt
CMD ["/usr/src/rt"]
