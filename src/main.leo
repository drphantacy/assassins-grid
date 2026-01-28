// Assassin's Grid - A ZK Hidden Information Strategy Game
// Two players secretly place 5 units (1 Assassin, 2 Guards, 2 Decoys) on a 5x5 grid
// Players take turns striking, scanning, or relocating to find and eliminate the opponent's Assassin

program assassins_grid.aleo {

    // ============================================
    // CONSTANTS
    // ============================================

    // Unit types
    const EMPTY: u8 = 0u8;
    const ASSASSIN: u8 = 1u8;
    const GUARD: u8 = 2u8;
    const DECOY: u8 = 3u8;

    // Position constants
    const ELIMINATED: u8 = 255u8;  // Unit has been eliminated
    const GRID_SIZE: u8 = 25u8;    // 5x5 grid

    // Game status
    const STATUS_WAITING: u8 = 0u8;      // Waiting for player 2
    const STATUS_ACTIVE: u8 = 1u8;       // Game in progress
    const STATUS_FINISHED: u8 = 2u8;     // Game completed

    // Action types for pending actions
    const ACTION_NONE: u8 = 0u8;
    const ACTION_STRIKE: u8 = 1u8;
    const ACTION_SCAN: u8 = 2u8;

    // Strike results
    const RESULT_MISS: u8 = 0u8;
    const RESULT_HIT_GUARD: u8 = 1u8;
    const RESULT_HIT_DECOY: u8 = 2u8;
    const RESULT_HIT_ASSASSIN: u8 = 3u8;

    // ============================================
    // DATA STRUCTURES
    // ============================================

    // Board state containing all unit positions (private to each player)
    struct BoardState {
        assassin_pos: u8,   // Position 0-24, or 255 if eliminated
        guard1_pos: u8,
        guard2_pos: u8,
        decoy1_pos: u8,
        decoy2_pos: u8,
        salt: field,        // Random salt for commitment
    }

    // Private game board record owned by each player
    record GameBoard {
        owner: address,
        game_id: field,
        board: BoardState,
        opponent: address,
        relocates_remaining: u8,  // Max 2 relocates per game
        is_player_one: bool,
    }

    // Public game metadata
    struct GameInfo {
        player1: address,
        player2: address,
        status: u8,              // 0=waiting, 1=active, 2=finished
        winner: address,
        created_at: u32,
    }

    // Turn state tracking
    struct TurnInfo {
        current_player: address,  // Whose turn it is
        turn_number: u32,
        pending_action: u8,       // 0=none, 1=strike, 2=scan
        pending_target: u8,       // Target for pending action
        pending_is_row: bool,     // For scan: true=row, false=column
        action_timestamp: u32,
    }

    // Scan result storage
    struct ScanResult {
        is_row: bool,
        index: u8,
        count: u8,
        scanner: address,
    }

    // ============================================
    // MAPPINGS (Public State)
    // ============================================

    // game_id => GameInfo
    mapping games: field => GameInfo;

    // Hash(game_id, player_index) => board commitment
    // player_index: 1 for player1, 2 for player2
    mapping commitments: field => field;

    // game_id => TurnInfo
    mapping turn_state: field => TurnInfo;

    // Hash(game_id, player_index) => bitfield of revealed squares (64 bits covers 25 squares)
    mapping revealed_squares: field => u64;

    // Hash(game_id, scan_count) => ScanResult
    mapping scan_history: field => ScanResult;

    // game_id => scan count for this game
    mapping scan_counts: field => u32;

    // game_id => winner address
    mapping game_results: field => address;

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    // Validate that a position is within the 5x5 grid
    inline valid_position(pos: u8) -> bool {
        return pos < GRID_SIZE;
    }

    // Check if all positions are unique (no two units on same square)
    inline all_unique(a: u8, b: u8, c: u8, d: u8, e: u8) -> bool {
        return a != b && a != c && a != d && a != e &&
               b != c && b != d && b != e &&
               c != d && c != e &&
               d != e;
    }

    // Validate board placement: 5 units, all in valid positions, no overlaps
    inline validate_placement(board: BoardState) -> bool {
        let valid_positions: bool = valid_position(board.assassin_pos) &&
                                    valid_position(board.guard1_pos) &&
                                    valid_position(board.guard2_pos) &&
                                    valid_position(board.decoy1_pos) &&
                                    valid_position(board.decoy2_pos);

        let unique_positions: bool = all_unique(
            board.assassin_pos,
            board.guard1_pos,
            board.guard2_pos,
            board.decoy1_pos,
            board.decoy2_pos
        );

        return valid_positions && unique_positions;
    }

    // Compute board commitment hash
    inline compute_commitment(board: BoardState) -> field {
        // Pack board state into a single field for hashing
        let packed: field = board.assassin_pos as field * 1000000000field +
                           board.guard1_pos as field * 10000000field +
                           board.guard2_pos as field * 100000field +
                           board.decoy1_pos as field * 1000field +
                           board.decoy2_pos as field * 10field +
                           board.salt;
        return BHP256::hash_to_field(packed);
    }

    // Get what unit type is at a given position
    inline get_unit_at(board: BoardState, target: u8) -> u8 {
        let is_assassin: bool = target == board.assassin_pos;
        let is_guard: bool = target == board.guard1_pos || target == board.guard2_pos;
        let is_decoy: bool = target == board.decoy1_pos || target == board.decoy2_pos;

        return is_assassin ? ASSASSIN : (is_guard ? GUARD : (is_decoy ? DECOY : EMPTY));
    }

    // Convert unit type to strike result
    inline unit_to_strike_result(unit_type: u8) -> u8 {
        // EMPTY->MISS(0), ASSASSIN->HIT_ASSASSIN(3), GUARD->HIT_GUARD(1), DECOY->HIT_DECOY(2)
        let is_empty: bool = unit_type == EMPTY;
        let is_assassin: bool = unit_type == ASSASSIN;
        let is_guard: bool = unit_type == GUARD;

        return is_empty ? RESULT_MISS : (is_assassin ? RESULT_HIT_ASSASSIN : (is_guard ? RESULT_HIT_GUARD : RESULT_HIT_DECOY));
    }

    // Check if a unit is in the specified row or column
    inline unit_in_line(pos: u8, is_row: bool, index: u8) -> u8 {
        let is_eliminated: bool = pos == ELIMINATED;
        let row: u8 = pos / 5u8;
        let col: u8 = pos % 5u8;
        let in_row: bool = is_row && row == index;
        let in_col: bool = !is_row && col == index;
        let matches: bool = (in_row || in_col) && !is_eliminated;
        return matches ? 1u8 : 0u8;
    }

    // Count units in a row or column
    // is_row: true = count in row, false = count in column
    // index: which row/column (0-4)
    inline count_units_in_line(board: BoardState, is_row: bool, index: u8) -> u8 {
        let c1: u8 = unit_in_line(board.assassin_pos, is_row, index);
        let c2: u8 = unit_in_line(board.guard1_pos, is_row, index);
        let c3: u8 = unit_in_line(board.guard2_pos, is_row, index);
        let c4: u8 = unit_in_line(board.decoy1_pos, is_row, index);
        let c5: u8 = unit_in_line(board.decoy2_pos, is_row, index);
        return c1 + c2 + c3 + c4 + c5;
    }

    // Eliminate a unit at target position and return updated board
    inline eliminate_unit(board: BoardState, target: u8) -> BoardState {
        return BoardState {
            assassin_pos: (target == board.assassin_pos) ? ELIMINATED : board.assassin_pos,
            guard1_pos: (target == board.guard1_pos) ? ELIMINATED : board.guard1_pos,
            guard2_pos: (target == board.guard2_pos) ? ELIMINATED : board.guard2_pos,
            decoy1_pos: (target == board.decoy1_pos) ? ELIMINATED : board.decoy1_pos,
            decoy2_pos: (target == board.decoy2_pos) ? ELIMINATED : board.decoy2_pos,
            salt: board.salt,
        };
    }

    // Check if a position is occupied by any surviving unit
    inline is_position_occupied(board: BoardState, pos: u8) -> bool {
        return pos == board.assassin_pos ||
               pos == board.guard1_pos ||
               pos == board.guard2_pos ||
               pos == board.decoy1_pos ||
               pos == board.decoy2_pos;
    }

    // Get hash key for commitment mapping
    inline get_commitment_key(game_id: field, player_index: u8) -> field {
        return BHP256::hash_to_field(game_id + player_index as field);
    }

    // Get hash key for revealed squares mapping
    inline get_revealed_key(game_id: field, player_index: u8) -> field {
        return BHP256::hash_to_field(game_id * 2field + player_index as field);
    }

    // Get hash key for scan history mapping
    inline get_scan_key(game_id: field, scan_index: u32) -> field {
        return BHP256::hash_to_field(game_id * 3field + scan_index as field);
    }

    // Get unit position by index
    inline get_unit_position(board: BoardState, unit_index: u8) -> u8 {
        let is_0: bool = unit_index == 0u8;
        let is_1: bool = unit_index == 1u8;
        let is_2: bool = unit_index == 2u8;
        let is_3: bool = unit_index == 3u8;

        return is_0 ? board.assassin_pos :
               (is_1 ? board.guard1_pos :
               (is_2 ? board.guard2_pos :
               (is_3 ? board.decoy1_pos : board.decoy2_pos)));
    }

    // ============================================
    // TRANSITIONS
    // ============================================

    // Phase 1: Game Creation
    // Player 1 creates a new game with their board placement
    async transition create_game(
        public game_id: field,
        private board: BoardState,
        public opponent: address,
    ) -> (GameBoard, Future) {
        // Validate board placement
        assert(validate_placement(board));

        // Compute commitment to board state
        let commitment: field = compute_commitment(board);

        // Create private game board record for player 1
        let game_board: GameBoard = GameBoard {
            owner: self.signer,
            game_id: game_id,
            board: board,
            opponent: opponent,
            relocates_remaining: 2u8,
            is_player_one: true,
        };

        // Return record and future for async finalization
        let f: Future = finalize_create_game(
            game_id,
            self.signer,
            opponent,
            commitment
        );

        return (game_board, f);
    }

    async function finalize_create_game(
        game_id: field,
        player1: address,
        player2: address,
        commitment: field,
    ) {
        // Ensure game doesn't already exist
        assert(!Mapping::contains(games, game_id));

        // Create game info
        let game_info: GameInfo = GameInfo {
            player1: player1,
            player2: player2,
            status: STATUS_WAITING,
            winner: player1,
            created_at: 0u32,
        };

        // Store game info
        Mapping::set(games, game_id, game_info);

        // Store player 1's commitment
        let commitment_key: field = get_commitment_key(game_id, 1u8);
        Mapping::set(commitments, commitment_key, commitment);

        // Initialize revealed squares for player 1's view of player 2's board
        let revealed_key: field = get_revealed_key(game_id, 1u8);
        Mapping::set(revealed_squares, revealed_key, 0u64);

        // Initialize scan count
        Mapping::set(scan_counts, game_id, 0u32);
    }

    // Phase 1: Join Game
    // Player 2 joins an existing game with their board placement
    async transition join_game(
        public game_id: field,
        private board: BoardState,
    ) -> (GameBoard, Future) {
        // Validate board placement
        assert(validate_placement(board));

        // Compute commitment to board state
        let commitment: field = compute_commitment(board);

        // Create private game board record for player 2
        let game_board: GameBoard = GameBoard {
            owner: self.signer,
            game_id: game_id,
            board: board,
            opponent: self.signer,
            relocates_remaining: 2u8,
            is_player_one: false,
        };

        let f: Future = finalize_join_game(
            game_id,
            self.signer,
            commitment
        );

        return (game_board, f);
    }

    async function finalize_join_game(
        game_id: field,
        player2: address,
        commitment: field,
    ) {
        // Get game info and verify it exists and is waiting
        let game_info: GameInfo = Mapping::get(games, game_id);
        assert(game_info.status == STATUS_WAITING);
        assert(game_info.player2 == player2);  // Must be the designated opponent

        // Update game status to active
        let updated_game: GameInfo = GameInfo {
            player1: game_info.player1,
            player2: player2,
            status: STATUS_ACTIVE,
            winner: game_info.winner,
            created_at: game_info.created_at,
        };
        Mapping::set(games, game_id, updated_game);

        // Store player 2's commitment
        let commitment_key: field = get_commitment_key(game_id, 2u8);
        Mapping::set(commitments, commitment_key, commitment);

        // Initialize revealed squares for player 2's view of player 1's board
        let revealed_key: field = get_revealed_key(game_id, 2u8);
        Mapping::set(revealed_squares, revealed_key, 0u64);

        // Initialize turn state - player 1 goes first
        let turn_info: TurnInfo = TurnInfo {
            current_player: game_info.player1,
            turn_number: 1u32,
            pending_action: ACTION_NONE,
            pending_target: 0u8,
            pending_is_row: false,
            action_timestamp: 0u32,
        };
        Mapping::set(turn_state, game_id, turn_info);
    }

    // Phase 2: Strike Action
    // Attacker selects a target square to strike on opponent's board
    async transition strike(
        private game_board: GameBoard,
        public target: u8,
    ) -> (GameBoard, Future) {
        // Validate target is in bounds
        assert(valid_position(target));

        // Return unchanged game board (attacker doesn't modify their own board)
        let updated_board: GameBoard = GameBoard {
            owner: game_board.owner,
            game_id: game_board.game_id,
            board: game_board.board,
            opponent: game_board.opponent,
            relocates_remaining: game_board.relocates_remaining,
            is_player_one: game_board.is_player_one,
        };

        let f: Future = finalize_strike(
            game_board.game_id,
            self.signer,
            target
        );

        return (updated_board, f);
    }

    async function finalize_strike(
        game_id: field,
        attacker: address,
        target: u8,
    ) {
        // Verify game is active
        let game_info: GameInfo = Mapping::get(games, game_id);
        assert(game_info.status == STATUS_ACTIVE);

        // Verify it's the attacker's turn and no pending action
        let turn_info: TurnInfo = Mapping::get(turn_state, game_id);
        assert(turn_info.current_player == attacker);
        assert(turn_info.pending_action == ACTION_NONE);

        // Set pending strike action
        let updated_turn: TurnInfo = TurnInfo {
            current_player: turn_info.current_player,
            turn_number: turn_info.turn_number,
            pending_action: ACTION_STRIKE,
            pending_target: target,
            pending_is_row: false,
            action_timestamp: 0u32,
        };
        Mapping::set(turn_state, game_id, updated_turn);
    }

    // Phase 2: Resolve Strike
    // Defender proves what unit (if any) was at the struck location
    async transition resolve_strike(
        private game_board: GameBoard,
        public strike_target: u8,
    ) -> (GameBoard, u8, Future) {
        // Determine what unit is at the target
        let unit_type: u8 = get_unit_at(game_board.board, strike_target);

        // Convert to strike result
        let strike_result: u8 = unit_to_strike_result(unit_type);

        // Update board if unit was hit (eliminate the unit)
        let unit_hit: bool = unit_type != EMPTY;
        let eliminated_board: BoardState = eliminate_unit(game_board.board, strike_target);
        let new_board: BoardState = unit_hit ? eliminated_board : game_board.board;

        // Compute new commitment for updated board
        let new_commitment: field = compute_commitment(new_board);

        // Create updated game board record
        let updated_game_board: GameBoard = GameBoard {
            owner: game_board.owner,
            game_id: game_board.game_id,
            board: new_board,
            opponent: game_board.opponent,
            relocates_remaining: game_board.relocates_remaining,
            is_player_one: game_board.is_player_one,
        };

        // Get player index for commitment update
        let player_index: u8 = game_board.is_player_one ? 1u8 : 2u8;

        let f: Future = finalize_resolve_strike(
            game_board.game_id,
            self.signer,
            strike_target,
            strike_result,
            new_commitment,
            player_index
        );

        return (updated_game_board, strike_result, f);
    }

    async function finalize_resolve_strike(
        game_id: field,
        defender: address,
        target: u8,
        result: u8,
        new_commitment: field,
        player_index: u8,
    ) {
        // Verify game is active
        let game_info: GameInfo = Mapping::get(games, game_id);
        assert(game_info.status == STATUS_ACTIVE);

        // Verify there's a pending strike and defender is the right player
        let turn_info: TurnInfo = Mapping::get(turn_state, game_id);
        assert(turn_info.pending_action == ACTION_STRIKE);
        assert(turn_info.pending_target == target);
        assert(turn_info.current_player != defender);  // Defender is not the attacker

        // Determine attacker's player index for revealed squares
        let attacker_index: u8 = (player_index == 1u8) ? 2u8 : 1u8;

        // Update revealed squares for attacker
        let revealed_key: field = get_revealed_key(game_id, attacker_index);
        let current_revealed: u64 = Mapping::get(revealed_squares, revealed_key);
        let new_revealed: u64 = current_revealed | (1u64 << (target as u32));
        Mapping::set(revealed_squares, revealed_key, new_revealed);

        // Update defender's commitment if unit was eliminated
        if result != RESULT_MISS {
            let commitment_key: field = get_commitment_key(game_id, player_index);
            Mapping::set(commitments, commitment_key, new_commitment);
        }

        // Check for win condition (assassin eliminated)
        if result == RESULT_HIT_ASSASSIN {
            let attacker: address = turn_info.current_player;
            let finished_game: GameInfo = GameInfo {
                player1: game_info.player1,
                player2: game_info.player2,
                status: STATUS_FINISHED,
                winner: attacker,
                created_at: game_info.created_at,
            };
            Mapping::set(games, game_id, finished_game);
            Mapping::set(game_results, game_id, attacker);
            return;
        }

        // Determine next player
        // If decoy hit, attacker gets bonus strike (same player)
        // Otherwise, turn passes to defender
        let is_decoy_hit: bool = result == RESULT_HIT_DECOY;
        let next_player: address = is_decoy_hit ? turn_info.current_player : defender;
        let next_turn_number: u32 = is_decoy_hit ? turn_info.turn_number : (turn_info.turn_number + 1u32);

        // Clear pending action and update turn
        let new_turn: TurnInfo = TurnInfo {
            current_player: next_player,
            turn_number: next_turn_number,
            pending_action: ACTION_NONE,
            pending_target: 0u8,
            pending_is_row: false,
            action_timestamp: 0u32,
        };
        Mapping::set(turn_state, game_id, new_turn);
    }

    // Phase 2: Scan Action
    // Query unit count in a row or column of opponent's board
    async transition scan(
        private game_board: GameBoard,
        public is_row: bool,
        public index: u8,
    ) -> (GameBoard, Future) {
        // Validate index is in bounds (0-4)
        assert(index < 5u8);

        // Return unchanged game board
        let updated_board: GameBoard = GameBoard {
            owner: game_board.owner,
            game_id: game_board.game_id,
            board: game_board.board,
            opponent: game_board.opponent,
            relocates_remaining: game_board.relocates_remaining,
            is_player_one: game_board.is_player_one,
        };

        let f: Future = finalize_scan(
            game_board.game_id,
            self.signer,
            is_row,
            index
        );

        return (updated_board, f);
    }

    async function finalize_scan(
        game_id: field,
        scanner: address,
        is_row: bool,
        index: u8,
    ) {
        // Verify game is active
        let game_info: GameInfo = Mapping::get(games, game_id);
        assert(game_info.status == STATUS_ACTIVE);

        // Verify it's the scanner's turn and no pending action
        let turn_info: TurnInfo = Mapping::get(turn_state, game_id);
        assert(turn_info.current_player == scanner);
        assert(turn_info.pending_action == ACTION_NONE);

        // Set pending scan action
        let updated_turn: TurnInfo = TurnInfo {
            current_player: turn_info.current_player,
            turn_number: turn_info.turn_number,
            pending_action: ACTION_SCAN,
            pending_target: index,
            pending_is_row: is_row,
            action_timestamp: 0u32,
        };
        Mapping::set(turn_state, game_id, updated_turn);
    }

    // Phase 2: Respond to Scan
    // Defender proves unit count in the scanned row/column
    async transition respond_scan(
        private game_board: GameBoard,
        public is_row: bool,
        public index: u8,
    ) -> (GameBoard, u8, Future) {
        // Count units in the specified line
        let count: u8 = count_units_in_line(game_board.board, is_row, index);

        // Return unchanged game board and count
        let updated_board: GameBoard = GameBoard {
            owner: game_board.owner,
            game_id: game_board.game_id,
            board: game_board.board,
            opponent: game_board.opponent,
            relocates_remaining: game_board.relocates_remaining,
            is_player_one: game_board.is_player_one,
        };

        let f: Future = finalize_respond_scan(
            game_board.game_id,
            self.signer,
            is_row,
            index,
            count
        );

        return (updated_board, count, f);
    }

    async function finalize_respond_scan(
        game_id: field,
        responder: address,
        is_row: bool,
        index: u8,
        count: u8,
    ) {
        // Verify game is active
        let game_info: GameInfo = Mapping::get(games, game_id);
        assert(game_info.status == STATUS_ACTIVE);

        // Verify there's a pending scan and responder is the defender
        let turn_info: TurnInfo = Mapping::get(turn_state, game_id);
        assert(turn_info.pending_action == ACTION_SCAN);
        assert(turn_info.pending_target == index);
        assert(turn_info.pending_is_row == is_row);
        assert(turn_info.current_player != responder);  // Responder is not the scanner

        // Store scan result in history
        let scan_count: u32 = Mapping::get(scan_counts, game_id);
        let scan_key: field = get_scan_key(game_id, scan_count);
        let scan_result: ScanResult = ScanResult {
            is_row: is_row,
            index: index,
            count: count,
            scanner: turn_info.current_player,
        };
        Mapping::set(scan_history, scan_key, scan_result);
        Mapping::set(scan_counts, game_id, scan_count + 1u32);

        // Clear pending action and pass turn to responder
        let new_turn: TurnInfo = TurnInfo {
            current_player: responder,
            turn_number: turn_info.turn_number + 1u32,
            pending_action: ACTION_NONE,
            pending_target: 0u8,
            pending_is_row: false,
            action_timestamp: 0u32,
        };
        Mapping::set(turn_state, game_id, new_turn);
    }

    // Phase 2: Relocate
    // Move one unit to an empty square (limited to 2 per game)
    async transition relocate(
        private game_board: GameBoard,
        private unit_index: u8,      // 0=assassin, 1=guard1, 2=guard2, 3=decoy1, 4=decoy2
        private new_position: u8,
    ) -> (GameBoard, Future) {
        // Validate unit index
        assert(unit_index < 5u8);

        // Validate new position is in bounds
        assert(valid_position(new_position));

        // Validate player has relocates remaining
        assert(game_board.relocates_remaining > 0u8);

        // Get current position of the unit
        let current_pos: u8 = get_unit_position(game_board.board, unit_index);

        // Validate unit is still alive
        assert(current_pos != ELIMINATED);

        // Validate new position is not occupied
        assert(!is_position_occupied(game_board.board, new_position));

        // Create updated board with new position
        let new_board: BoardState = BoardState {
            assassin_pos: (unit_index == 0u8) ? new_position : game_board.board.assassin_pos,
            guard1_pos: (unit_index == 1u8) ? new_position : game_board.board.guard1_pos,
            guard2_pos: (unit_index == 2u8) ? new_position : game_board.board.guard2_pos,
            decoy1_pos: (unit_index == 3u8) ? new_position : game_board.board.decoy1_pos,
            decoy2_pos: (unit_index == 4u8) ? new_position : game_board.board.decoy2_pos,
            salt: game_board.board.salt,
        };

        // Compute new commitment
        let new_commitment: field = compute_commitment(new_board);

        // Get player index
        let player_index: u8 = game_board.is_player_one ? 1u8 : 2u8;

        // Create updated game board
        let updated_game_board: GameBoard = GameBoard {
            owner: game_board.owner,
            game_id: game_board.game_id,
            board: new_board,
            opponent: game_board.opponent,
            relocates_remaining: game_board.relocates_remaining - 1u8,
            is_player_one: game_board.is_player_one,
        };

        let f: Future = finalize_relocate(
            game_board.game_id,
            self.signer,
            new_commitment,
            player_index
        );

        return (updated_game_board, f);
    }

    async function finalize_relocate(
        game_id: field,
        player: address,
        new_commitment: field,
        player_index: u8,
    ) {
        // Verify game is active
        let game_info: GameInfo = Mapping::get(games, game_id);
        assert(game_info.status == STATUS_ACTIVE);

        // Verify it's the player's turn and no pending action
        let turn_info: TurnInfo = Mapping::get(turn_state, game_id);
        assert(turn_info.current_player == player);
        assert(turn_info.pending_action == ACTION_NONE);

        // Update commitment
        let commitment_key: field = get_commitment_key(game_id, player_index);
        Mapping::set(commitments, commitment_key, new_commitment);

        // Pass turn to opponent
        let is_player1: bool = player == game_info.player1;
        let opponent: address = is_player1 ? game_info.player2 : game_info.player1;

        let new_turn: TurnInfo = TurnInfo {
            current_player: opponent,
            turn_number: turn_info.turn_number + 1u32,
            pending_action: ACTION_NONE,
            pending_target: 0u8,
            pending_is_row: false,
            action_timestamp: 0u32,
        };
        Mapping::set(turn_state, game_id, new_turn);
    }

    // Utility: Forfeit game due to timeout or voluntary surrender
    async transition forfeit(
        private game_board: GameBoard,
    ) -> Future {
        let f: Future = finalize_forfeit(
            game_board.game_id,
            self.signer
        );

        return f;
    }

    async function finalize_forfeit(
        game_id: field,
        player: address,
    ) {
        // Verify game is active
        let game_info: GameInfo = Mapping::get(games, game_id);
        assert(game_info.status == STATUS_ACTIVE);

        // Verify player is in the game
        assert(player == game_info.player1 || player == game_info.player2);

        // Determine winner (opponent of forfeiting player)
        let is_player1: bool = player == game_info.player1;
        let winner: address = is_player1 ? game_info.player2 : game_info.player1;

        // Update game to finished
        let finished_game: GameInfo = GameInfo {
            player1: game_info.player1,
            player2: game_info.player2,
            status: STATUS_FINISHED,
            winner: winner,
            created_at: game_info.created_at,
        };
        Mapping::set(games, game_id, finished_game);
        Mapping::set(game_results, game_id, winner);
    }
}
