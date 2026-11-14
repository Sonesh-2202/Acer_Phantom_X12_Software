# YJX receiver report descriptor inventory

Raw report descriptors were retrieved through hidapi's read-only `get_report_descriptor()` call. Each receiver HID collection is captured independently; reports below are decoded from descriptor main items.

## A8A5:2255 — YJX-CHIP / USB Receiver

- Interface: 0; collection usage: `0x0001:0x0002`
- Descriptor length: 75 bytes; ID 2: input 8 B (64 bits)
- Raw bytes: [`A8A5_2255_mi0_up0001_u0002.txt`](report_descriptors/A8A5_2255_mi0_up0001_u0002.txt)
- Decoded items:
```text
Global usage_page = 0x1
Local usage = 0x2
Collection type 0x1 (usage page 0x1, usage 2)
Local usage = 0x1
Collection type 0x0 (usage page 0x1, usage 1)
Global report_id = 2
Global usage_page = 0x9
Global report_size = 1
Global report_count = 16
Input report ID 2, 1 bits × 16 = 16 bits (main flags 0x2; usage page 0x9)
Global usage_page = 0x1
Local usage = 0x30
Local usage = 0x31
Global report_size = 16
Global report_count = 2
Input report ID 2, 16 bits × 2 = 32 bits (main flags 0x6; usage page 0x1)
Local usage = 0x38
Global report_size = 8
Global report_count = 1
Input report ID 2, 8 bits × 1 = 8 bits (main flags 0x6; usage page 0x1)
Global usage_page = 0xC
Local usage = 0x238
Global report_size = 8
Global report_count = 1
Input report ID 2, 8 bits × 1 = 8 bits (main flags 0x6; usage page 0xC)
End collection
End collection
```

## A8A5:2255 — YJX-CHIP / USB Receiver

- Interface: 0; collection usage: `0x000C:0x0001`
- Descriptor length: 25 bytes; ID 3: input 4 B (32 bits)
- Raw bytes: [`A8A5_2255_mi0_up000C_u0001.txt`](report_descriptors/A8A5_2255_mi0_up000C_u0001.txt)
- Decoded items:
```text
Global usage_page = 0xC
Local usage = 0x1
Collection type 0x1 (usage page 0xC, usage 1)
Global report_id = 3
Global report_size = 16
Global report_count = 2
Input report ID 3, 16 bits × 2 = 32 bits (main flags 0x0; usage page 0xC)
End collection
```

## A8A5:2255 — YJX-CHIP / USB Receiver

- Interface: 0; collection usage: `0x0001:0x0080`
- Descriptor length: 31 bytes; ID 4: input 1 B (8 bits)
- Raw bytes: [`A8A5_2255_mi0_up0001_u0080.txt`](report_descriptors/A8A5_2255_mi0_up0001_u0080.txt)
- Decoded items:
```text
Global usage_page = 0x1
Local usage = 0x80
Collection type 0x1 (usage page 0x1, usage 128)
Global report_id = 4
Local usage = 0x82
Local usage = 0x81
Local usage = 0x83
Global report_size = 2
Global report_count = 1
Input report ID 4, 2 bits × 1 = 2 bits (main flags 0x60; usage page 0x1)
Global report_size = 6
Global report_count = 1
Input report ID 4, 6 bits × 1 = 6 bits (main flags 0x3; usage page 0x1)
End collection
```

## A8A5:2255 — YJX-CHIP / USB Receiver

- Interface: 0; collection usage: `0xFFA5:0x0088`
- Descriptor length: 25 bytes; ID 9: input 1 B (8 bits)
- Raw bytes: [`A8A5_2255_mi0_upFFA5_u0088.txt`](report_descriptors/A8A5_2255_mi0_upFFA5_u0088.txt)
- Decoded items:
```text
Global usage_page = 0xFFA5
Local usage = 0x88
Collection type 0x1 (usage page 0xFFA5, usage 136)
Global report_id = 9
Global report_size = 8
Global report_count = 1
Input report ID 9, 8 bits × 1 = 8 bits (main flags 0x0; usage page 0xFFA5)
End collection
```

## A8A5:2255 — YJX-CHIP / USB Receiver

- Interface: 1; collection usage: `0x0001:0x0006`
- Descriptor length: 68 bytes; ID 1: input 8 B (64 bits), output 1 B (8 bits)
- Raw bytes: [`A8A5_2255_mi1_up0001_u0006.txt`](report_descriptors/A8A5_2255_mi1_up0001_u0006.txt)
- Decoded items:
```text
Global usage_page = 0x1
Local usage = 0x6
Collection type 0x1 (usage page 0x1, usage 6)
Global report_id = 1
Global usage_page = 0x7
Global report_size = 1
Global report_count = 8
Input report ID 1, 1 bits × 8 = 8 bits (main flags 0x2; usage page 0x7)
Global report_size = 8
Global report_count = 1
Input report ID 1, 8 bits × 1 = 8 bits (main flags 0x3; usage page 0x7)
Global report_size = 8
Global report_count = 6
Input report ID 1, 8 bits × 6 = 48 bits (main flags 0x0; usage page 0x7)
Global usage_page = 0x8
Global report_size = 1
Global report_count = 3
Output report ID 1, 1 bits × 3 = 3 bits (main flags 0x2; usage page 0x8)
Global report_size = 5
Global report_count = 1
Output report ID 1, 5 bits × 1 = 5 bits (main flags 0x3; usage page 0x8)
End collection
```

## A8A5:2255 — YJX-CHIP / USB Receiver

- Interface: 1; collection usage: `0x000C:0x0001`
- Descriptor length: 25 bytes; ID 3: input 2 B (16 bits)
- Raw bytes: [`A8A5_2255_mi1_up000C_u0001.txt`](report_descriptors/A8A5_2255_mi1_up000C_u0001.txt)
- Decoded items:
```text
Global usage_page = 0xC
Local usage = 0x1
Collection type 0x1 (usage page 0xC, usage 1)
Global report_id = 3
Global report_size = 16
Global report_count = 1
Input report ID 3, 16 bits × 1 = 16 bits (main flags 0x0; usage page 0xC)
End collection
```

## A8A5:2255 — YJX-CHIP / USB Receiver

- Interface: 1; collection usage: `0x0001:0x0080`
- Descriptor length: 31 bytes; ID 4: input 1 B (8 bits)
- Raw bytes: [`A8A5_2255_mi1_up0001_u0080.txt`](report_descriptors/A8A5_2255_mi1_up0001_u0080.txt)
- Decoded items:
```text
Global usage_page = 0x1
Local usage = 0x80
Collection type 0x1 (usage page 0x1, usage 128)
Global report_id = 4
Local usage = 0x81
Local usage = 0x82
Local usage = 0x83
Global report_size = 2
Global report_count = 1
Input report ID 4, 2 bits × 1 = 2 bits (main flags 0x60; usage page 0x1)
Global report_size = 6
Global report_count = 1
Input report ID 4, 6 bits × 1 = 6 bits (main flags 0x3; usage page 0x1)
End collection
```

## A8A5:2255 — YJX-CHIP / USB Receiver

- Interface: 1; collection usage: `0xFF05:0x0002`
- Descriptor length: 23 bytes; ID 10: input 63 B (504 bits)
- Raw bytes: [`A8A5_2255_mi1_upFF05_u0002.txt`](report_descriptors/A8A5_2255_mi1_upFF05_u0002.txt)
- Decoded items:
```text
Global usage_page = 0xFF05
Local usage = 0x2
Collection type 0x1 (usage page 0xFF05, usage 2)
Global report_id = 10
Local usage = 0x2
Global report_size = 8
Global report_count = 63
Input report ID 10, 8 bits × 63 = 504 bits (main flags 0x0; usage page 0xFF05)
End collection
```

## A8A5:2255 — YJX-CHIP / USB Receiver

- Interface: 1; collection usage: `0xFF06:0x0002`
- Descriptor length: 36 bytes; ID 11: input 63 B (504 bits), output 63 B (504 bits)
- Raw bytes: [`A8A5_2255_mi1_upFF06_u0002.txt`](report_descriptors/A8A5_2255_mi1_upFF06_u0002.txt)
- Decoded items:
```text
Global usage_page = 0xFF06
Local usage = 0x2
Collection type 0x1 (usage page 0xFF06, usage 2)
Global report_id = 11
Local usage = 0x2
Global report_size = 8
Global report_count = 63
Input report ID 11, 8 bits × 63 = 504 bits (main flags 0x2; usage page 0xFF06)
Local usage = 0x2
Global report_size = 8
Global report_count = 63
Output report ID 11, 8 bits × 63 = 504 bits (main flags 0x2; usage page 0xFF06)
End collection
```

## A8A5:2255 — YJX-CHIP / USB Receiver

- Interface: 2; collection usage: `0xFF01:0x0010`
- Descriptor length: 38 bytes; ID 0: input 64 B (512 bits), output 64 B (512 bits)
- Raw bytes: [`A8A5_2255_mi2_upFF01_u0010.txt`](report_descriptors/A8A5_2255_mi2_upFF01_u0010.txt)
- Decoded items:
```text
Global usage_page = 0xFF01
Local usage = 0x10
Collection type 0x1 (usage page 0xFF01, usage 16)
Global report_size = 8
Global report_count = 64
Input report ID 0, 8 bits × 64 = 512 bits (main flags 0x2; usage page 0xFF01)
Global report_size = 8
Global report_count = 64
Output report ID 0, 8 bits × 64 = 512 bits (main flags 0x2; usage page 0xFF01)
End collection
```
