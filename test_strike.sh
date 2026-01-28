#!/bin/bash

# Player 1 strikes position 22 on opponent's board
# NOTE: In real usage, you'd pass the actual GameBoard record from create_game output
# This uses a sample record structure for testing

leo run strike \
  "{owner:aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px.private,game_id:1field.private,board:{assassin_pos:12u8.private,guard1_pos:0u8.private,guard2_pos:24u8.private,decoy1_pos:6u8.private,decoy2_pos:18u8.private,salt:123456789field.private},opponent:aleo1u2y99vvgjc7fzmuv4wj7dq9txpls5enwd9y0e55ez5rpstjnlggsra6vlw.private,relocates_remaining:2u8.private,is_player_one:true.private,_nonce:0group.public}" \
  22u8
