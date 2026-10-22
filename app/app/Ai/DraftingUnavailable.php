<?php

namespace App\Ai;

use RuntimeException;

/** A drafting failure with a message that is safe and kind to show to the person. */
class DraftingUnavailable extends RuntimeException {}
