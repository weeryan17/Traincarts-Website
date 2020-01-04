create table external_accounts_types
(
    type_id   char(3) primary key not null,
    type_name varchar(30) null
);

create table external_accounts
(
    account_id          int auto_increment
        primary key,
    account_type        char(3)     null,
    external_account_id varchar(50) null,
    constraint external_accounts_external_accounts_types_type_id_fk
        foreign key (account_type) references external_accounts_types (type_id)
);

create table oauth_clients
(
    client_id     char(50)     not null,
    client_name   varchar(100) not null,
    client_secret varchar(100) not null,
    primary key (client_id)
);

create table oauth_uris
(
    client_id varchar(50)  not null,
    uri       varchar(200) not null,
    primary key (client_id, uri)
);

create table traincarts_users
(
    id                int primary key auto_increment,
    username          varchar(50)      null,
    email             varchar(60)      null,
    password          text             null,
    account_activated bit default b'0' not null,
    activation_key    varchar(30)      null,
    recovery_key      varchar(20)      null,
    recovery_expire   datetime         null,
    constraint users_activation_key_uindex
        unique (activation_key),
    constraint users_email_uindex
        unique (email),
    constraint users_id_uindex
        unique (id),
    constraint users_username_uindex
        unique (username)
);

create table oauth_codes
(
    code      varchar(50) not null,
    expire    datetime    null,
    uri       text        null,
    user_id   int         null,
    client_id varchar(50) null,
    primary key (code),
    constraint oauth_codes_oauth_clients_client_id_fk
        foreign key (client_id) references oauth_clients (client_id),
    constraint oauth_codes_traincarts_users_id_fk
        foreign key (user_id) references traincarts_users (id)
);

create table oauth_tokens
(
    client_id      varchar(50)  not null,
    user_id        int          not null,
    access_token   varchar(100) not null,
    access_expire  datetime     not null,
    refresh_token  varchar(100) not null,
    refresh_expire datetime     not null,
    primary key (client_id, user_id, access_token),
    constraint oauth_tokens_ibfk_1
        foreign key (client_id) references oauth_clients (client_id),
    constraint oauth_tokens_ibfk_2
        foreign key (user_id) references traincarts_users (id)
);

create table user_accounts
(
    user_id    int not null,
    account_id int not null,
    primary key (user_id, account_id),
    constraint user_accounts_external_accounts_account_id_fk
        foreign key (account_id) references external_accounts (account_id),
    constraint user_accounts_users_id_fk
        foreign key (user_id) references traincarts_users (id)
);

create table external_accounts_oauth_tokens
(
    account_id int         not null,
    access     varchar(50) null,
    refresh    varchar(50) null,
    primary key (account_id),
    constraint external_accounts_oauth_tokens_user_accounts_account_id_fk
        foreign key (account_id) references user_accounts (account_id)
);

create table user_backup_codes
(
    user_id     int              not null,
    backup_code char(6)          not null,
    used        bit default b'0' null,
    primary key (backup_code, user_id),
    constraint user_backup_codes_traincarts_users_id_fk
        foreign key (user_id) references traincarts_users (id)
);

create table user_twofa
(
    user_id      int      not null,
    twofa_secret char(32) null,
    primary key (user_id),
    constraint user_twofa_traincarts_users_id_fk
        foreign key (user_id) references traincarts_users (id)
);

INSERT INTO traincarts_main.external_accounts_types (type_id, type_name) VALUES ('dis', 'discord');


