#!/bin/bash

# Player 2 joins the game with their board placement
leo run join_game \
  1field \
  "{assassin_pos:22u8,guard1_pos:3u8,guard2_pos:21u8,decoy1_pos:10u8,decoy2_pos:14u8,salt:987654321field}"
