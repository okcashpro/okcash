// Copyright (c) 2015 The ShadowCoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file license.txt or http://www.opensource.org/licenses/mit-license.php.

#ifndef TYPES_H
#define TYPES_H

typedef std::vector<uint8_t> data_chunk;

const size_t EC_SECRET_SIZE = 32;
const size_t EC_COMPRESSED_SIZE = 33;
const size_t EC_UNCOMPRESSED_SIZE = 65;

typedef struct ec_secret { uint8_t e[EC_SECRET_SIZE]; } ec_secret;

typedef data_chunk ec_point;


#endif  // TYPES_H